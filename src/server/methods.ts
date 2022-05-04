import * as WebSocket from 'ws';
import { Player } from './player';
import { Map } from './map';
import { Game } from './game';
import { WorldGenerator } from './worldGenerator';

interface ConnectionData {
  ws: WebSocket,
  ip: string,
  username: string | null,
  gameID: number | null,
}

export const connections: WebSocket[] = [];
export const connData: ConnectionData[] = [];

const sendTo = (ws: WebSocket, msg: { [key: string]: unknown }) => {
  ws.send(JSON.stringify(msg));
};

export const games: { [gameID: number] : Game } = {
  0: new Game(
    // new Map(38, 38, JSON.parse(fs.readFileSync( path.join(__dirname, 'saves/0.json') ).toString()).map),
    new Map(38, 38, ...new WorldGenerator(3634, 38, 38).generate(0.5, 0.9, 1)),
    {
      playerCount: 2,
    }
  ),
};

export const getConnData = (ws: WebSocket): ConnectionData => {
  const connIndex = connections.indexOf(ws);
  return connData[connIndex];
};

export const methods = {
  setPlayer: (ws: WebSocket, username: string) => {
    getConnData(ws).username = username;
  },

  joinGame: (ws: WebSocket, gameID: number) => {
    const game = games[gameID];
    const username = getConnData(ws).username;

    const civID = game?.newPlayerCivID();

    if (civID !== null) {
      getConnData(ws).gameID = gameID;
      game.connectPlayer(username, new Player(civID, ws));

      sendTo(ws, {
        update: [
          ['civID', [ civID ]],
          ['colorPool', [ game.world.getColorPool() ]],
        ],
      });

      const gameList = {};
      for (const id in games) {
        gameList[id] = games[id].getMetaData();
      }

      for (const conn of connData) {
        if (conn.gameID === null) {
          sendTo(conn.ws, {
            update: [
              ['gameList', [gameList]],
            ],
          });
        }
      }
    } else {
      sendTo(ws, { error: [
        ['kicked', ['Game full']],
      ] });
    }
  },

  getGames: (ws: WebSocket) => {
    const gameList = {};
    for (const gameID in games) {
      gameList[gameID] = games[gameID].getMetaData();
    }

    sendTo(ws, {
      update: [
        ['gameList', [gameList]],
      ],
    });
  },

  setColor: (ws: WebSocket, color: string) => {
    const { username, gameID } = getConnData(ws);
    const game = games[gameID];

    if (game) {
      const player = game.getPlayer(username);

      if (player) {
        if (game.world.setCivColor(player.civID, color)) {
          game.sendToAll({
            update: [
              ['colorPool', [ game.world.getColorPool() ]],
            ],
          });
        } else {
          sendTo(ws, {
            error: [
              ['colorTaken', ['That color is no longer available']],
            ],
          });
        }
      }
    }
  },

  ready: (ws: WebSocket, state: boolean) => {
    const { username, gameID } = getConnData(ws);
    const game = games[gameID];

    if (game) {
      const player = game.getPlayer(username);

      if (player) {
        const civ = game.world.getCiv(player.civID);

        if (!civ.color) {
          sendTo(ws, { error: [
            ['notReady', ['Please select civ color']],
          ] });
          return;
        }

        player.ready = state;

        if (Object.keys(game.players).length === game.playerCount) {
          if (Object.values(game.players).every((player: Player) => player.ready)) {
            game.sendToAll({
              update: [
                ['beginGame', [ [game.world.map.width, game.world.map.height], game.playerCount ]],
                ['civData', [ game.world.getAllCivsData() ]],
              ],
            });

            game.forEachCivID((civID: number) => {
              game.sendToCiv(civID, {
                update: [
                  ['setMap', [game.world.map.getCivMap(civID)]],
                ],
              });
            });

            game.beginTurnForCiv(0);
          }
        }
      }
    }
  },

  // Deprecated
  // TODO: replace with turnFinished
  endTurn: (ws: WebSocket) => {
    const { username, gameID } = getConnData(ws);
    const game = games[gameID];
    const civID = game.players[username].civID;

    game.sendToCiv(civID, {
      error: [
        ['deprecatedAction', ['endTurn is deprecated; use turnFinished instead.']],
      ],
    });

    return;
  },

  turnFinished: (ws: WebSocket, state: boolean) => {
    const { username, gameID } = getConnData(ws);
    const game = games[gameID];
    const civID = game.players[username].civID;
    const civ = game.world.civs[civID];

    if (!civ.turnActive) {
      game.sendToCiv(civID, {
        error: [
          ['turnExpired', []],
        ],
      });

      return;
    }

    // mark civ as finished/unfinished
    civ.turnFinished = state;

    // see if all players are finished...
    let finished = true;
    for (let civID = 0; civID < game.playerCount; civID++) {
      const civ = game.world.civs[civID];
      if (civ.turnActive && !civ.turnFinished) {
        finished = false;
        break;
      }
    }

    // if so:
    if (finished) {
      // end all players' turns
      game.forEachPlayer((player: Player) => {
        if (!player.isAI) {
          game.endTurnForCiv(player.civID);
        }
      });

      // Run AIs

      // begin all players' turns
      game.forEachPlayer((player: Player) => {
        if (!player.isAI) {
          game.beginTurnForCiv(player.civID);
        }
      });
    }
  },

  moveUnit: (ws: WebSocket, srcCoords: Coords, path: Coords[], attack: boolean) => {
    const { username, gameID } = getConnData(ws);
    const game = games[gameID];
    const civID = game.players[username].civID;

    console.log(srcCoords, path, attack);

    if (game) {
      const world = game.world;
      const map = world.map;

      let src = map.getTile(srcCoords);

      for (const dstCoords of path) {
        const dst = map.getTile(dstCoords);

        const unit = src.unit;

        if ( !unit || unit.civID !== civID || !(unit.movement >= dst.getMovementCost(unit)) ) {
          game.sendUpdates();
          return;
        }

        if (dst.unit) {
          break;
        }

        // mark tiles currently visible by unit as unseen
        const srcVisible = map.getVisibleTilesCoords(unit);
        for (const coords of srcVisible) {
          map.setTileVisibility(civID, coords, false);
        }

        unit.movement -= dst.getMovementCost(unit);
        map.moveUnitTo(unit, dstCoords);

        // mark tiles now visible by unit as seen
        const newVisible = map.getVisibleTilesCoords(unit);
        for (const coords of newVisible) {
          map.setTileVisibility(civID, coords, true);
        }

        src = dst;
      }

      if (attack) {
        const unit = src.unit;
        const target = map.getTile(path[path.length - 1]);
        if (target.unit && unit.isAdjacentTo(target.unit.coords)) {
          world.meleeCombat(unit, target.unit);
          unit.movement = 0;
        }
      }

      game.sendUpdates();
    }
  },

  settleCity: (ws: WebSocket, coords: Coords, name: string) => {
    const { username, gameID } = getConnData(ws);
    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;

      const unit = map.getTile(coords)?.unit
      if (unit?.type === 'settler' && unit?.civID === civID) {
        map.settleCityAt(coords, name, civID);
      }
    }
  },
};
