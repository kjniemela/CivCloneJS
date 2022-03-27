const resize = () => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
  ctx.setTransform(1, 0, 0, -1, canvas.width / 2, canvas.height / 2);
  ctx.webkitImageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
  camera.render(world);
}

window.onload = () => {
  resize();
};
window.onresize = resize;
document.getElementById('canvas').onwheel = (evt) => {
  const canvas = document.getElementById('canvas');
  if (evt.deltaY > 0) {
    const { zoom, x: camX, y: camY } = camera;
    const { tiles, size } = world;
    const [ scx1, scy1, scx2, scy2 ] = [
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width / 2,
      canvas.height / 2
    ];
    const yStart = (Math.round((-((12.5 * world.size * zoom) + scy2)) / (25 * zoom)) + (world.size - 2));
    if (yStart > 1) {
      camera.zoom *= 0.9;
    }
  } else {
    if (camera.zoom < 10) {
      camera.zoom *= 1.1;
    }
  }
};

let mouseX = 0;
let mouseY = 0;
let oldX = 0;
let oldY = 0;
let clickX = 0;
let clickY = 0;
let mouseDown = false;
const getMousePos = ( canvas, evt ) => {
  const rect = canvas.getBoundingClientRect();
  const pos = {
        x: Math.floor( ( evt.clientX - rect.left ) / ( rect.right - rect.left ) * canvas.width ),
        y: Math.floor( ( evt.clientY - rect.top ) / ( rect.bottom - rect.top ) * canvas.height )
    };
  return pos;
}
document.getElementById('canvas').onmousemove = (evt) => {
	const mousePos = getMousePos(canvas, evt);
	mouseX = mousePos.x - Math.round(canvas.width/2);
	mouseY = canvas.height - (mousePos.y + Math.round(canvas.height/2));
	// selX = x+mouseX/size;
	// selY = y+mouseY/size;
	if (mouseDown) {
		camera.x = oldX - ((mouseX-clickX) / camera.zoom);
		camera.y = oldY - ((mouseY-clickY) / camera.zoom);
	}
};
document.getElementById('canvas').onmousedown = function(evt) {
	const mousePos = getMousePos(canvas, evt);
	clickX = mousePos.x - Math.round(canvas.width/2);
	clickY = canvas.height - (mousePos.y + Math.round(canvas.height/2));
	mouseDown = true;
}
document.getElementById('canvas').onmouseup = function(evt) {
	const mousePos = getMousePos(canvas, evt);
	mouseDown = false;
	oldX = camera.x;
	oldY = camera.y;
}

const mod = (a, b) => {
  if (a >= 0) {
    return a % b;
  } else {
    return ((a % b) + b) % b;
  }
};

// const SERVER_IP = '192.168.5.47:8080';
const SERVER_IP = '192.168.4.29:8080';
const PLAYER_NAME = localStorage.getItem('username') || prompt('Username?');
localStorage.setItem('username', PLAYER_NAME);

camera = new Camera();
player = new Player(PLAYER_NAME);
ui = new UI();
world = new World();
world.setup(SERVER_IP)
  .then(() => {

    world.sendActions([
      ['getGames', []],
      ['setPlayer', [player.name]],
    ]);

    world.on.update.gameList = (gameList) => {
      let gameTitles = [];
      let defaultGame = Object.keys(gameList)[0];
      for (let gameID in gameList) {
        gameTitles.push(`#${gameID} - ${gameList[gameID].gameName}`)
      }

      const gameID = prompt(`Select game to join:\n${gameTitles.join('\n')}`, defaultGame);
      
      if (gameID !== null) {
        world.sendActions([
          ['joinGame', [gameID]],
        ]);

        ui.showReadyBtn((isReady) => {
          world.sendActions([
            ['ready', [isReady]],
          ]);
        });
      }
    };

    world.on.update.beginGame = (gameList) => {
      ui.hideReadyBtn();
    };

    setInterval(() => camera.render(world), 1000/60);
  });