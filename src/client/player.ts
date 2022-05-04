interface Leader {
  id: number;
  color: string;
  name: string;
  civID: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class UI {

  elements: { [key: string]: HTMLElement };
  leaderPool: Leader[];
  takenLeaders: Leader[];
  turnActive: boolean;
  buttons: { [key: string]: Button };
  textInputs: { [key: string]: TextInput };
  textAlerts: { [key: string]: TextAlert };

  public view: string;

  constructor() {
    this.elements = {
      readyBtn: this.createElement('button', 'readyBtn'),
      centerModal: this.createElement('div', 'centerModal'),
      civPicker: this.createElement('ul', 'civList'),
      mainMenu: this.createElement('div', 'mainMenu'),
      gameList: this.createElement('div', 'gameList'),
    };
    this.leaderPool = [];
    this.takenLeaders = [];
    this.turnActive = false;

    this.buttons = {
      mainBtn: new Button(this.createElement('button', 'mainActionBtn'), {
        text: 'MainBtn',
        action: null,
      }),
    };

    this.textInputs = {
      loginMenu: new TextInput({
        query: 'Please log in:',
        fields: [
          ['Username', 'username here...'],
          ['Password', 'password here...'],
        ]
      }),
      ipSelect: new TextInput({
        query: 'Enter Server Address:',
        fields: [
          ['Address', ''],
        ]
      }),
    };

    this.textAlerts = {
      errorAlert: new TextAlert({
        message: 'Error',
      }),
    };
  }

  setView(view: string) {
    this.view = view;
  }

  hideAll(): void {
    for (const widgetName in this.buttons) {
      this.buttons[widgetName].hide();
    }

    for (const widgetName in this.textInputs) {
      this.textInputs[widgetName].hide();
    }

    for (const widgetName in this.textAlerts) {
      this.textAlerts[widgetName].hide();
    }

    // TODO: generalize this
    this.hideReadyBtn();
    this.hideCivPicker();
    this.hideGameList();
    this.hideMainMenu();
  }

  createElement(type: string, className=null): HTMLElement {
    const element = document.createElement(type);
    if (className) {
      element.className = className;
    }
    return element;
  }

  createCivItem(leader: Leader): HTMLElement {
    const civItem = this.createElement('li', 'civItem');
    civItem.style.backgroundColor = leader.color;
    const nameText = this.createElement('span');
    nameText.innerHTML = `${leader.name} - Selected by ${leader.civID}`;
    civItem.appendChild(nameText);
    return civItem;
  }

  setTurnState(state: boolean) {
    this.turnActive = state;

    if (state) {
      this.buttons.mainBtn.setAction(['turnFinished', [true]]);
      this.buttons.mainBtn.setText('Finish');
    } else {
      this.buttons.mainBtn.setText('Waiting...');
    }
  }

  showGameUI(world: World): void {

    for (const buttonID in this.buttons) {
      const button = this.buttons[buttonID];
      button.bind((state: ButtonState) => {
        if (state.action) {
          world.sendActions([
            state.action,
          ]);
        }
      });

      document.getElementById('UI').appendChild(button.element);
    }
  }

  showCivPicker(callback: (leaderID: number) => void, self: Player): void {
    this.elements.civPicker.innerHTML = '';
    const selectedLeaderSlot = this.createElement('div', 'selectedLeader');
    this.elements.civPicker.appendChild(selectedLeaderSlot);
    for (let i = 0; i < this.leaderPool.length; i++) {
      const leader = this.leaderPool[i];
      const civItem = this.createCivItem(leader);
      civItem.onclick = () => {
        callback(leader.id);
      };
      this.elements.civPicker.appendChild(civItem);
    }
    for (let i = 0; i < this.takenLeaders.length; i++) {
      const leader = this.takenLeaders[i];
      const civItem = this.createCivItem(leader);
      civItem.onclick = () => {
        alert('That leader is already selected!')
      };
      if (leader.civID === self.civID) {
        selectedLeaderSlot.appendChild(civItem);
      } else {
        this.elements.civPicker.appendChild(civItem);
      }
    }

    this.elements.centerModal.appendChild(this.elements.civPicker);
    document.getElementById('UI').appendChild(this.elements.centerModal);
  }

  hideCivPicker(): void {
    this.elements.civPicker.remove();
    this.elements.centerModal.remove();
  }

  showReadyBtn(callback: (isReady: boolean) => void): void {
    let btnState = false;
    this.elements.readyBtn.innerText = 'Ready';

    this.elements.readyBtn.onclick = () => {
      btnState = !btnState;
      if (btnState) {
        this.elements.readyBtn.innerText = 'Waiting';
      } else {
        this.elements.readyBtn.innerText = 'Ready';
      }

      callback(btnState);
    };

    document.getElementById('UI').appendChild(this.elements.readyBtn);
  }

  hideReadyBtn(): void {
    this.elements.readyBtn.remove();
  }

  showMainMenu(callbacks: {
    listGames: () => void,
    logout: () => void,
    changeServer: () => void,
  }): void {
    this.elements.mainMenu.innerHTML = '';

    const titleHeading = this.createElement('h1');
    titleHeading.innerText = 'CivCloneJS';
    this.elements.mainMenu.appendChild(titleHeading);

    const gameListBtn = this.createElement('button');
    gameListBtn.innerText = 'List Games';
    gameListBtn.onclick = () => callbacks.listGames();
    this.elements.mainMenu.appendChild(gameListBtn);

    const changeServerBtn = this.createElement('button');
    changeServerBtn.innerText = 'Switch Server';
    changeServerBtn.onclick = () => callbacks.changeServer();
    this.elements.mainMenu.appendChild(changeServerBtn);

    const logoutBtn = this.createElement('button');
    logoutBtn.innerText = 'Logout';
    logoutBtn.onclick = () => callbacks.logout();
    this.elements.mainMenu.appendChild(logoutBtn);

    this.elements.centerModal.appendChild(this.elements.mainMenu);
    document.getElementById('UI').appendChild(this.elements.centerModal);
  }

  hideMainMenu(): void {
    this.elements.mainMenu.remove();
    this.elements.centerModal.remove();
  }

  showGameList(gameList: { [key: string]: GameMetadata }, callbacks: {
    joinGame: (gameID: string) => void,
  }): void {
    this.elements.gameList.innerHTML = '';

    const titleHeading = this.createElement('h1');
    titleHeading.innerText = 'Active Games';
    this.elements.gameList.appendChild(titleHeading);

    for (const gameID in gameList) {
      const { gameName, playersConnected, playerCount } = gameList[gameID];
      const gameBtn = this.createElement('button');
      gameBtn.innerText = `${gameName} - ${playersConnected} / ${playerCount} players connected`;
      gameBtn.onclick = () => callbacks.joinGame(gameID);
      this.elements.gameList.appendChild(gameBtn);
    }

    this.elements.centerModal.appendChild(this.elements.gameList);
    document.getElementById('UI').appendChild(this.elements.centerModal);
  }

  hideGameList(): void {
    this.elements.gameList.remove();
    this.elements.centerModal.remove();
  }
}
