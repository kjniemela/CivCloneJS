"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = exports.getConnData = exports.games = exports.connData = exports.connections = void 0;
const player_1 = require("./player");
const map_1 = require("./map");
const game_1 = require("./game");
const worldGenerator_1 = require("./worldGenerator");
exports.connections = [];
exports.connData = [];
const sendTo = (ws, msg) => {
    ws.send(JSON.stringify(msg));
};
exports.games = {
    0: new game_1.Game(
    // new Map(38, 38, JSON.parse(fs.readFileSync( path.join(__dirname, 'saves/0.json') ).toString()).map),
    new map_1.Map(38, 38, ...new worldGenerator_1.WorldGenerator(3634, 38, 38).generate(0.5, 0.9, 1)), {
        playerCount: 2,
    }),
};
const getConnData = (ws) => {
    const connIndex = exports.connections.indexOf(ws);
    return exports.connData[connIndex];
};
exports.getConnData = getConnData;
exports.methods = {
    setPlayer: (ws, username) => {
        (0, exports.getConnData)(ws).username = username;
    },
    joinGame: (ws, gameID) => {
        const game = exports.games[gameID];
        const username = (0, exports.getConnData)(ws).username;
        const civID = game === null || game === void 0 ? void 0 : game.newPlayerCivID();
        if (civID !== null) {
            (0, exports.getConnData)(ws).gameID = gameID;
            game.connectPlayer(username, new player_1.Player(civID, ws));
            sendTo(ws, {
                update: [
                    ['civID', [civID]],
                    ['leaderPool', [...game.world.getLeaderPool()]],
                ],
            });
            const gameList = {};
            for (const id in exports.games) {
                gameList[id] = exports.games[id].getMetaData();
            }
            for (const conn of exports.connData) {
                if (conn.gameID === null) {
                    sendTo(conn.ws, {
                        update: [
                            ['gameList', [gameList]],
                        ],
                    });
                }
            }
        }
        else {
            sendTo(ws, { error: [
                    ['kicked', ['Game full']],
                ] });
        }
    },
    getGames: (ws) => {
        const gameList = {};
        for (const gameID in exports.games) {
            gameList[gameID] = exports.games[gameID].getMetaData();
        }
        sendTo(ws, {
            update: [
                ['gameList', [gameList]],
            ],
        });
    },
    setLeader: (ws, leaderID) => {
        const { username, gameID } = (0, exports.getConnData)(ws);
        const game = exports.games[gameID];
        if (game) {
            const player = game.getPlayer(username);
            if (player) {
                if (game.world.setCivLeader(player.civID, leaderID)) {
                    game.sendToAll({
                        update: [
                            ['leaderPool', [...game.world.getLeaderPool()]],
                        ],
                    });
                }
                else {
                    sendTo(ws, {
                        error: [
                            ['leaderTaken', ['That leader is no longer available']],
                        ],
                    });
                }
            }
        }
    },
    ready: (ws, state) => {
        const { username, gameID } = (0, exports.getConnData)(ws);
        const game = exports.games[gameID];
        if (game) {
            const player = game.getPlayer(username);
            if (player) {
                const civ = game.world.getCiv(player.civID);
                if (!civ.leader) {
                    sendTo(ws, { error: [
                            ['notReady', ['Please select leader']],
                        ] });
                    return;
                }
                player.ready = state;
                if (Object.keys(game.players).length === game.playerCount) {
                    if (Object.values(game.players).every((player) => player.ready)) {
                        game.sendToAll({
                            update: [
                                ['beginGame', [[game.world.map.width, game.world.map.height], game.playerCount]],
                                ['civData', [game.world.getAllCivsData()]],
                            ],
                        });
                        game.forEachCivID((civID) => {
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
    endTurn: (ws) => {
        const { username, gameID } = (0, exports.getConnData)(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        game.sendToCiv(civID, {
            error: [
                ['deprecatedAction', ['endTurn is deprecated; use turnFinished instead.']],
            ],
        });
        return;
    },
    turnFinished: (ws, state) => {
        const { username, gameID } = (0, exports.getConnData)(ws);
        const game = exports.games[gameID];
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
            game.forEachPlayer((player) => {
                if (!player.isAI) {
                    game.endTurnForCiv(player.civID);
                }
            });
            // Run AIs
            // begin all players' turns
            game.forEachPlayer((player) => {
                if (!player.isAI) {
                    game.beginTurnForCiv(player.civID);
                }
            });
        }
    },
    moveUnit: (ws, srcCoords, path, attack) => {
        const { username, gameID } = (0, exports.getConnData)(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        console.log(srcCoords, path, attack);
        if (game) {
            const world = game.world;
            const map = world.map;
            let src = map.getTile(srcCoords);
            for (const dstCoords of path) {
                const dst = map.getTile(dstCoords);
                const unit = src.unit;
                if (!unit || unit.civID !== civID || !(unit.movement >= dst.getMovementCost(unit))) {
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
    settleCity: (ws, coords, name) => {
        var _a;
        const { username, gameID } = (0, exports.getConnData)(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            const unit = (_a = map.getTile(coords)) === null || _a === void 0 ? void 0 : _a.unit;
            if ((unit === null || unit === void 0 ? void 0 : unit.type) === 'settler' && (unit === null || unit === void 0 ? void 0 : unit.civID) === civID) {
                map.settleCityAt(coords, name, civID);
            }
        }
    },
};
//# sourceMappingURL=methods.js.map