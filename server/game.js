class Game {
  constructor(map, playerCount) {
    this.map = map;
    this.civs = {};
    this.players = {};
    this.playerCount = playerCount;

    this.metaData = {
      gameName: "New Game",
    };
  }

  newPlayerCivID() {
    const freeCivs = {};
    for (let i = 0; i < this.playerCount; i++) {
      freeCivs[i] = true;
    }

    for (let player in this.players) {
      delete freeCivs[this.players[player].civ];
    }

    const freeIDs = Object.keys(freeCivs);

    if (freeIDs.length > 0) {
      return Math.min(...freeIDs);
    } else {
      return null;
    }
  }

  sendToAll(msg) {
    for (let playerName in this.players) {
      let player = this.players[playerName];

      if (player.isAI) {
        
      } else {
        player.connection.send(JSON.stringify(msg));
      }
    }
  };

  sendToCiv(civ, msg) {
    let player = Object.values(this.players).find(val => val.civ === civ);

    if (!player) {
      console.error("Error: Could not find player for Civilization #" + civ);
      return;
    }

    if (player.isAI) {
      
    } else {
       player.connection.send(JSON.stringify(msg));
    }
  };
};

class Map {
  constructor(height, width, terrain) {
    this.height = height;
    this.width = width;
    this.tiles = new Array(height*width);
    for (let i = 0; i < height*width; i++) {
      this.tiles[i] = new Tile(terrain[i]);
    }
  }

  getCivMap(civ) {
    return this.tiles.map((tile) => {
      if (tile.serverData.discoveredBy.includes(civ)) {
        return tile.clientData;
      } else {
        return null;
      }
    });
  }
};

class Tile {
  constructor(type) {
    this.clientData = {
      type: type,
      improvement: null,
    };

    this.serverData = {
      discoveredBy: [],
    };
  }
};

class Player {
  constructor(civ, connection) {
    this.civ = civ;
    this.ready = false;
    this.isAI = !connection;
    this.connection = connection;
  }
};

module.exports = {
  Game, Map, Tile, Player,
};
