// eslint-disable-next-line @typescript-eslint/no-unused-vars
class UI {
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
        this.players = {};
        this.civs = {};
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
    setView(view) {
        this.view = view;
    }
    hideAll() {
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
    createElement(type, className = null) {
        const element = document.createElement(type);
        if (className) {
            element.className = className;
        }
        return element;
    }
    createCivItem(leader) {
        const civItem = this.createElement('li', 'civItem');
        civItem.style.backgroundColor = leader.color;
        const nameText = this.createElement('span');
        nameText.innerHTML = `${leader.name}` + (leader.civID !== null ? ` - Selected by ${this.civs[leader.civID].name}` : '');
        civItem.appendChild(nameText);
        return civItem;
    }
    setTurnState(state) {
        this.turnActive = state;
        if (state) {
            this.buttons.mainBtn.setAction(['turnFinished', [true]]);
            this.buttons.mainBtn.setText('Finish');
        }
        else {
            this.buttons.mainBtn.setText('Waiting...');
        }
    }
    showGameUI(world) {
        for (const buttonID in this.buttons) {
            const button = this.buttons[buttonID];
            button.bind((state) => {
                if (state.action) {
                    world.sendActions([
                        state.action,
                    ]);
                }
            });
            document.getElementById('UI').appendChild(button.element);
        }
    }
    showCivPicker(callback, self) {
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
                alert('That leader is already selected!');
            };
            if (leader.civID === self.civID) {
                selectedLeaderSlot.appendChild(civItem);
            }
            else {
                this.elements.civPicker.appendChild(civItem);
            }
        }
        this.elements.centerModal.appendChild(this.elements.civPicker);
        document.getElementById('UI').appendChild(this.elements.centerModal);
    }
    hideCivPicker() {
        this.elements.civPicker.remove();
        this.elements.centerModal.remove();
    }
    showReadyBtn(callback) {
        let btnState = false;
        this.elements.readyBtn.innerText = 'Ready';
        this.elements.readyBtn.onclick = () => {
            btnState = !btnState;
            if (btnState) {
                this.elements.readyBtn.innerText = 'Waiting';
            }
            else {
                this.elements.readyBtn.innerText = 'Ready';
            }
            callback(btnState);
        };
        document.getElementById('UI').appendChild(this.elements.readyBtn);
    }
    hideReadyBtn() {
        this.elements.readyBtn.remove();
    }
    showMainMenu(callbacks) {
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
    hideMainMenu() {
        this.elements.mainMenu.remove();
        this.elements.centerModal.remove();
    }
    showGameList(gameList, callbacks) {
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
    hideGameList() {
        this.elements.gameList.remove();
        this.elements.centerModal.remove();
    }
}
//# sourceMappingURL=player.js.map