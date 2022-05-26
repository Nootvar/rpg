"use strict";

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const height = 704;
const width = 832;

canvas.width = width;
canvas.height = height;

const halfHeight = Math.round(height / 2);
const halfWidth = Math.round(width / 2);
const maxX = Math.round(height / 64);
const maxY = Math.round(width / 64);
const renderingMaxX = maxX + 1;
const renderingMaxY = maxY + 1;
const halfX = Math.round((height - 64) / 128);
const halfY = Math.round((width - 64) / 128);

const seed = Date.now();

const fonts = {
  small: "14px Segoe UI",
  medium: "24px Segoe UI",
  large: "32px Segoe UI",
};

class Square {
  constructor(
    id,
    type,
    walkable = true,
    transparent = false,
    height = 64,
    width = 64,
    coordinates = null
  ) {
    this.id = id;
    this.type = type;
    this.walkable = walkable;
    this.transparent = transparent;
    this.height = height;
    this.width = width;
    this.coordinates = coordinates;
  }

  get renderId() {
    return this.id;
  }

  update() {}

  action(currentCoordinates, nextCoordinates) {
    return false;
  }

  autoAction() {}

  static fromJSON(json) {
    return new Square(
      json.id,
      json.type,
      json.walkable,
      json.transparent,
      json.height,
      json.width,
      json.coordinates
    );
  }
}

class Wall extends Square {
  constructor(variant = "") {
    super("wall" + variant, "Square", false);
  }
}

class Roof extends Square {
  constructor() {
    super("roof", "Square", false);
  }
}

class Path extends Square {
  constructor(variant = "") {
    super("path" + variant, "Square", true, true);
  }
}

class Log extends Square {
  constructor() {
    super("log", "Square", false, true);
  }
}

class Leaf extends Square {
  constructor() {
    super("leaf", "Square", false);
  }
}

class Plank extends Square {
  constructor() {
    super("plank", "Square", true);
  }
}

class Water extends Square {
  constructor() {
    super("water", "Square", false);
  }
}

class Stair extends Square {
  constructor() {
    super("stair", "Square", true);
  }
}

class Rock extends Square {
  constructor() {
    super("rock", "Square", false);
  }
}

class CaveFloor extends Square {
  constructor() {
    super("caveFloor", "Square");
  }
}

class Talkable extends Square {
  constructor(
    dialogs,
    id,
    type,
    walkable = true,
    transparent = false,
    currentDialogKey = "start"
  ) {
    super(id, type, walkable, transparent);
    this.dialogs = dialogs;
    this.currentDialogKey = currentDialogKey;
  }

  getDialog() {
    let currentDialog = this.dialogs[this.currentDialogKey];

    if (currentDialog.next) this.currentDialogKey = currentDialog.next;

    return currentDialog;
  }

  getCurrentDialog() {
    return this.dialogs[this.currentDialogKey];
  }

  action(currentCoordinates, nextCoordinates) {
    gameInstance.currentDialog = this.getDialog();
    return true;
  }

  chooseOption(index) {
    let current = this.dialogs[this.currentDialogKey];

    if (
      current.options &&
      current.options[index] &&
      (!current.options[index].available || current.options[index].available())
    ) {
      this.currentDialogKey = current.options[index].key;
      if (current.options[index].action) current.options[index].action();
    } else if (current.next) this.currentDialogKey = current.next;

    gameInstance.currentDialog = this.getDialog();
  }

  static fromJSON(json) {
    return new Talkable(
      json.dialogs,
      json.id,
      json.type,
      json.walkable,
      json.transparent,
      json.currentDialogKey
    );
  }
}

class HouseDoor extends Talkable {
  constructor() {
    super(
      {
        start: { text: "The door is closed", next: "no" },
        no: { text: "No, you can't enter", next: "end" },
        end: { text: "Stop trying" },
      },
      "houseDoor",
      "Talkable",
      false
    );
  }
}

class StartCharacter extends Talkable {
  constructor() {
    super(
      {
        start: { text: "Greeting stranger!", next: "want" },
        want: {
          text: "Are you looking for an adventure ?",
          options: [{ key: "no", text: "Indeed !" }],
        },
        no: { text: "There is no adventure!", next: "lol" },
        lol: { text: "No, I'm joking", next: "yes" },
        yes: { text: "There is one, but...", next: "end" },
        end: {
          text: [
            "I won't tell you anything more",
            "Are you trying to mess with me ?",
            "Stop bothering me !",
          ],
        },
      },
      "character",
      "Talkable",
      false,
      true
    );
  }
}

class Woman extends Talkable {
  constructor() {
    super(
      {
        start: {
          text: "Greeting",
          options: [{ key: "question", text: "Hello !" }],
        },
        question: {
          text: ["What are you doing here ?", "Why are you here ?"],
          options: [
            { key: "adventure", text: "I'm looking for an adventure !" },
            { key: "nothing", text: "I don't know" },
          ],
        },
        adventure: { text: "An adventure ?", next: "no" },
        nothing: { text: "Ho, ok...", next: "no" },
        no: { text: "To be honest, I don't care...", next: "end" },
        end: { text: ["Now go away !", "No, shut up"] },
      },
      "woman",
      "Talkable",
      false,
      true
    );
  }
}

class Miner extends Talkable {
  constructor(currentDialogKey = "start") {
    super(
      {
        start: {
          text: "Hello there adventurer ! Could you help me with something ?",
          options: [
            { key: "yes", text: "Yes" },
            { key: "no", text: "No, I have not time for this" },
          ],
        },
        yes: {
          text: "Well you see, I was mining in the cave at the north of the village when a slime attacked me",
          next: "yesNext",
        },
        yesNext: {
          text: "Scared in the moment, I dropped my pickaxe and flee the cave",
          next: "proposeQuest",
        },
        proposeQuest: {
          text: "Could you recover it for me ? And maybe take care of that slime ?",
          options: [
            {
              key: "yesQuest",
              text: "Of course",
              action: () => gameInstance.questHandler.add(new MinerQuest()),
            },
            { key: "noQuest", text: "Sorry, I would prefer not" },
          ],
        },
        yesQuest: {
          text: "Thanks you ! I will be sure to have a reward for you",
          next: "didYouFind",
        },
        noQuest: { text: "Well then I will have to find another way..." },
        no: { text: "Okay" },
        didYouFind: {
          text: "Did you find my pickaxe ?",
          options: [
            {
              key: "yesFind",
              text: "Yes ! Here it is !",
              action: () => gameInstance.questHandler.complete("minerQuest"),
              available: () => gameInstance.player.has("pickaxe"),
            },
            { key: "noFind", text: "No I'm still looking for it" },
          ],
        },
        noFind: { text: "Well take you time", next: "didYouFind" },
        yesFind: { text: "It's perfect ! Here is you reward", next: "reward" },
        reward: {
          text: "It's an axe from a friend of mine, I am sure it will be useful to you. He doesn't need it anymore",
          next: "end",
        },
        end: { text: "Thanks for the help" },
      },
      "miner",
      "Miner",
      false,
      true,
      currentDialogKey
    );
  }

  fromJSON(json) {
    return new Miner(json.currentDialogKey);
  }
}

class ShopOwner extends Talkable {
  constructor(shop, id, type) {
    super(
      {
        start: {
          text: "Hello, do you whish to buy equipment ?",
          options: [
            {
              key: "yes",
              text: "Yes",
              action: () => (gameInstance.currentShop = shop),
            },
            { key: "no", text: "No" },
          ],
        },
        yes: { text: "Suit yourself !", next: "start" },
        no: { text: "Well, good day to you then !", next: "start" },
      },
      id,
      type,
      false,
      true
    );
    this.shop = shop;
  }

  static fromJSON(json) {
    return new ShopOwner(ShopInventory.fromJSON(json.shop), json.id, json.type);
  }
}

class VillageShopOwner extends ShopOwner {
  constructor() {
    super(
      new ShopInventory(
        [
          { item: new HealthPotion(), price: 5 },
          { item: new HealthPotion(), price: 5 },
          { item: new SpeedPotion(), price: 5 },
          { item: new SpeedPotion(), price: 5 },
          { item: new SimpleArmor(), price: 10 },
        ],
        "Old village shop"
      ),
      "villageShopOwner",
      "ShopOwner"
    );
  }
}

class MapAccessSquare extends Square {
  constructor(id, type, mapKey, newX, newY, defaultSquare = "grass") {
    super(id, type, false);
    this.mapKey = mapKey;
    this.newX = newX;
    this.newY = newY;
    this.defaultSquare = defaultSquare;
  }

  action(currentCoordinates, nextCoordinates) {
    gameInstance.goToMap(this.mapKey, this.newX, this.newY);
    return false;
  }

  static fromJSON(json) {
    return new MapAccessSquare(
      json.id,
      json.type,
      json.mapKey,
      json.newX,
      json.newY,
      json.defaultSquare
    );
  }
}

class HouseEntrance extends MapAccessSquare {
  constructor() {
    super("houseDoor", "MapAccessSquare", "houseMap", 4, 3);
  }
}

class CaveEntrance extends MapAccessSquare {
  constructor() {
    super("caveEntrance", "MapAccessSquare", "caveMap", 14, 3, "rock");
  }
}

class VillageShopEntrance extends MapAccessSquare {
  constructor() {
    super("houseDoor", "MapAccessSquare", "villageShopMap", 4, 3);
  }
}

class HouseExit extends MapAccessSquare {
  constructor() {
    super("houseDoor", "MapAccessSquare", "map", 10, 1);
  }
}

class CaveExit extends MapAccessSquare {
  constructor() {
    super("caveEntrance", "MapAccessSquare", "map", 3, 12);
  }
}

class VillageShopExit extends MapAccessSquare {
  constructor() {
    super("houseDoor", "MapAccessSquare", "map", 13, 10);
  }
}

class Entity extends Square {
  damaged = 0;
  attacking = 0;
  movingData = { direction: null, addedDx: 0, addedDy: 0 };

  constructor(
    id,
    type,
    health,
    speed = 1,
    damage = 0,
    hand = null,
    drop = null,
    armor = null
  ) {
    super(id, type, false, true);
    this.health = health;
    this.speed = speed;
    this.damage = damage;
    this.hand = hand;
    this.drop = drop;
    this.armor = armor;
  }

  get attack() {
    if (this.hand && this.hand.damage) return this.hand.damage;
    return this.damage;
  }

  applyDamage(damage) {
    if (this.armor) damage = this.armor.reduceDamage(damage);

    this.health -= damage;
    this.damaged = 16;
  }

  postRender(dx, dy, showHealth = true) {
    if (this.armor) draw(this.armor.id, dx, dy);

    if (showHealth)
      for (let i = 0; i < this.health; i++)
        draw("heart", dx - 16, dy + i * 16, 16, 16);
    if (this.hand) {
      if (gameInstance.lastDirection === "right")
        if (this.attacking >= 24)
          draw(this.hand.id + "1Right", dx + 8, dy + 18, 32, 48);
        else if (this.attacking >= 16)
          draw(this.hand.id + "2Right", dx + 8, dy + 18, 32, 48);
        else if (this.attacking >= 8)
          draw(this.hand.id + "1Right", dx + 8, dy + 18, 32, 48);
        else draw(this.hand.id + "Right", dx + 8, dy + 18, 32, 32);
      else if (this.attacking >= 24)
        draw(this.hand.id + "1", dx + 8, dy - 2, 32, 48);
      else if (this.attacking >= 16)
        draw(this.hand.id + "2", dx + 8, dy - 2, 32, 48);
      else if (this.attacking >= 8)
        draw(this.hand.id + "1", dx + 8, dy - 2, 32, 48);
      else draw(this.hand.id, dx + 8, dy + 14, 32, 32);
    }
  }

  update() {
    if (this.movingData.direction)
      updateMovingData(this.movingData, this.speed);

    if (this.damaged > 0) this.damaged--;

    if (this.attacking > 0) this.attacking--;
  }

  action() {
    return true;
  }

  move(direction, x, y) {
    this.movingData = getMovingData(direction);
    return moveSquareByDirection(direction, x, y);
  }

  static fromJSON(json) {
    return new Entity(
      json.id,
      json.type,
      json.health,
      json.speed,
      json.damage,
      squareFromJSON(json.hand),
      squareFromJSON(json.drop),
      squareFromJSON(json.armor)
    );
  }
}

class Slime extends Entity {
  constructor(health = 3, speed = 0.5, damage = 1) {
    super("slime", "Slime", health, speed, damage, null, new DroppedMoney(5));
  }

  get renderId() {
    if (this.damaged > 0) return this.id + "Damaged";

    if (this.movingData.direction || this.attacking > 0) return this.id + "1";
    return this.id;
  }

  autoAction(x, y) {
    if (!this.movingData.direction) {
      let direction = getRandomElement(["up", "down", "left", "right"]);
      let newCoordinates = getCoordinates(direction, x, y);
      let newSquare = getSquare(newCoordinates);
      if (
        newCoordinates.x === gameInstance.player.currentX &&
        newCoordinates.y === gameInstance.player.currentY
      ) {
        this.attacking = 64;
        gameInstance.player.applyDamage(this.attack);
      } else if (!newSquare || newSquare.walkable) {
        this.move(direction, x, y);
      }
    }
  }

  static fromJSON(json) {
    return new Slime(json.health, json.speed, json.damage);
  }
}

class Mount extends Entity {
  isMount = true;

  constructor(id, type, health, speed) {
    super(id, type, health, speed);
    this.walkable = true;
    this.addedId = id.charAt(0).toUpperCase() + id.slice(1);
  }

  postRender(dx, dy) {
    super.postRender(dx, dy, false);
  }

  static fromJSON(json) {
    return new Mount(json.id, json.type, json.health, json.speed);
  }
}

class Horse extends Mount {
  constructor() {
    super("horse", "Mount", 20, 2);
  }
}

class Item extends Square {
  constructor(
    id,
    type,
    name,
    description,
    height = 32,
    width = 32,
    canBePicked = true
  ) {
    super(id, type, true, true, height, width);
    this.name = name;
    this.description = description;
    this.canBePicked = canBePicked;
  }

  affect(entity) {}

  static fromJSON(json) {
    return new Item(
      json.id,
      json.type,
      json.name,
      json.description,
      json.height,
      json.width,
      json.canBePicked
    );
  }
}

class DroppedMoney extends Item {
  constructor(value) {
    super("money", "DroppedMoney", "Money", "Money", 64, 64);
    this.value = value;
  }

  static fromJSON(json) {
    return new DroppedMoney(json.value);
  }
}

class HealthPotion extends Item {
  constructor() {
    super(
      "healthPotion",
      "HealthPotion",
      "Health Potion",
      "Give 5 health points"
    );
  }

  affect(entity) {
    entity.health += 5;
  }

  static fromJSON(json) {
    return new HealthPotion();
  }
}

class SpeedPotion extends Item {
  constructor() {
    super(
      "speedPotion",
      "SpeedPotion",
      "Speed Potion",
      "Give 100% speed boost for 1 minutes"
    );
  }

  affect(entity) {
    entity.speed++;
    setTimeout(() => entity.speed--, 60000);
  }

  static fromJSON(json) {
    return new SpeedPotion();
  }
}

class Weapon extends Item {
  constructor(id, type, name, description, damage) {
    super(id, type, name, description);
    this.damage = damage;
  }

  affect(target) {
    if (target.inventory) {
      if (target.hand) target.inventory.add(target.hand);
      target.hand = this;
    }
  }

  static fromJSON(json) {
    return new Weapon(
      json.id,
      json.type,
      json.name,
      json.description,
      json.damage
    );
  }
}

class Sword extends Weapon {
  constructor() {
    super(
      "sword",
      "Weapon",
      "Sword",
      "A simple sword that deal 2 damage per hit",
      2
    );
  }
}

class Axe extends Weapon {
  constructor() {
    super("axe", "Weapon", "Axe", "A basic axe that deal 3 damage per hit", 3);
  }
}

class Pickaxe extends Weapon {
  constructor() {
    super(
      "pickaxe",
      "Weapon",
      "Pickaxe",
      "A pickaxe for mining, deal 1 damage per hit",
      1
    );
  }
}

class Armor extends Item {
  constructor(id, type, name, description, height = 64, width = 64) {
    super(id, type, name, description, height, width);
  }

  reduceDamage(damage) {
    return damage;
  }

  affect(target) {
    if (target.inventory) {
      if (target.armor) target.inventory.add(target.armor);
      target.armor = this;
    }
  }

  static fromJSON(json) {
    return new Armor(
      json.id,
      json.type,
      json.name,
      json.description,
      json.height,
      json.width
    );
  }
}

class SimpleArmor extends Armor {
  constructor() {
    super(
      "armor",
      "SimpleArmor",
      "Simple armor",
      "Reduce damage dealt by enemies by 1"
    );
  }

  reduceDamage(damage) {
    damage--;
    return damage < 0 ? 0 : damage;
  }

  static fromJSON(json) {
    return new SimpleArmor();
  }
}

class Inventory {
  selectedIndex = 0;

  constructor(items = []) {
    this.items = items;
  }

  add(...items) {
    items.forEach((item) => this.items.push(item));
  }

  remove(itemId) {
    let index = this.items.findIndex((item) => item.id === itemId);
    if (index > -1) this.items.splice(index, 1);
  }

  use(itemId, target) {
    let index = this.items.findIndex((item) => item.id === itemId);
    if (index > -1) {
      this.items[index].affect(target);
      this.items.splice(index, 1);
    }
  }

  resetSelection() {
    this.selectedIndex = 0;
  }

  selectNext() {
    if (this.selectedIndex < this.items.length - 1) this.selectedIndex++;
  }

  selectPrevious() {
    if (this.selectedIndex > 0) this.selectedIndex--;
  }

  useSelected(target) {
    if (this.items.length > 0) {
      this.items[this.selectedIndex].affect(target);
      this.items.splice(this.selectedIndex, 1);
      this.resetSelection();
    }
  }

  getSelected() {
    return this.items[this.selectedIndex];
  }

  has(itemId) {
    return this.items.findIndex((item) => item.id === itemId) > -1;
  }

  static fromJSON(json) {
    return new Inventory(json.items.map((item) => squareFromJSON(item)));
  }
}

class ShopInventory {
  selectedIndex = 0;

  constructor(items = [], name) {
    this.items = items;
    this.name = name;
  }

  resetSelection() {
    this.selectedIndex = 0;
  }

  selectNext() {
    if (this.selectedIndex < this.items.length - 1) this.selectedIndex++;
  }

  selectPrevious() {
    if (this.selectedIndex > 0) this.selectedIndex--;
  }

  buySelected() {
    if (this.items.length > 0) {
      let item = this.items[this.selectedIndex];
      if (gameInstance.player.money >= item.price) {
        gameInstance.player.inventory.add(this.items[this.selectedIndex].item);
        gameInstance.player.money -= item.price;
        this.items.splice(this.selectedIndex, 1);
        this.resetSelection();
      }
    }
  }

  getSelected() {
    return this.items[this.selectedIndex];
  }

  static fromJSON(json) {
    let items = json.items.map((item) => {
      return { price: item.price, item: squareFromJSON(item.item) };
    });
    return new ShopInventory(items, json.name);
  }
}

class Player extends Entity {
  constructor(
    inventory = new Inventory(),
    health = 5,
    speed = 1,
    damage = 1,
    money = 0,
    mount = null,
    currentX = 0,
    currentY = 0
  ) {
    super("player", "Player", health, speed, damage, new Sword());
    this.inventory = inventory;
    this.money = money;
    this.mount = mount;
    this.currentX = currentX;
    this.currentY = currentY;
  }

  pick(item) {
    if (item.damage && item.damage > this.attack) {
      this.inventory.add(this.hand);
      this.hand = item;
    } else if (item.value) this.money += item.value;
    else this.inventory.add(item);
  }

  use(itemId) {
    this.inventory.use(itemId, this);
  }

  has(itemId) {
    return this.inventory.has(itemId) || (this.hand && this.hand.id === itemId);
  }

  remove(itemId) {
    if (this.hand && this.hand.id === itemId) this.hand = null;
    else this.inventory.remove(itemId);
  }

  get renderId() {
    let finalId = this.id;
    if (this.mount) {
      if (!this.movingData.direction) finalId += this.mount.addedId;
      else if (gameInstance.tick % 44 < 22) finalId += this.mount.addedId + "1";
      else finalId += this.mount.addedId + "2";
    } else if (this.damaged > 0) finalId += "Damaged";
    else if (this.movingData.direction && gameInstance.tick % 64 < 32)
      finalId += "1";
    else if (this.movingData.direction) finalId += "2";

    return gameInstance.lastDirection === "right" ? finalId + "Right" : finalId;
  }

  climb(mount) {
    this.mount = mount;
    this.height = 96;
    this.speed = mount.speed;
  }

  dismount() {
    if (this.mount) {
      let mount = this.mount;
      this.mount = null;
      this.height = 64;
      this.speed = 1;

      addSquare(getCurrentCoordinates(), mount);
    }
  }

  move(direction) {
    let newCoordinates = super.move(direction, this.currentX, this.currentY);
    this.currentX = newCoordinates.x;
    this.currentY = newCoordinates.y;
  }

  postRender(dx, dy) {
    super.postRender(dx, dy, false);
  }

  static fromJSON(json) {
    return new Player(
      Inventory.fromJSON(json.inventory),
      json.health,
      json.speed,
      json.damage,
      json.money,
      squareFromJSON(json.mount),
      json.currentX,
      json.currentY
    );
  }
}

class Quest {
  constructor(id, type, name, description) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.description = description;
  }

  onSucceed() {}
  onFailed() {}

  static fromJSON(json) {
    return new Quest(json.id, json.type, json.name, json.description);
  }
}

class MinerQuest extends Quest {
  constructor() {
    super(
      "minerQuest",
      "MinerQuest",
      "The miner quest",
      "The miner lost his pickaxe in the cave at the north of the village after a slime attack. Help him recover it and you will be recompensed"
    );
  }

  onSucceed() {
    gameInstance.player.remove("pickaxe");
    gameInstance.player.inventory.add(new Axe());
  }

  static fromJSON(json) {
    return new MinerQuest();
  }
}

class QuestHandler {
  selectedQuestIndex = 0;

  constructor(quests = {}, currentQuestId = null) {
    this.quests = quests;
    this.currentQuestId = currentQuestId;
  }

  add(quest) {
    if (Object.keys(this.quests).length === 0) this.currentQuestId = quest.id;
    this.quests[quest.id] = quest;
  }

  getCurrent() {
    if (this.currentQuestId) return this.quests[this.currentQuestId];
    return null;
  }

  getSelected() {
    if (Object.keys(this.quests).length > 0)
      return this.quests[Object.keys(this.quests)[this.selectedQuestIndex]];
    return null;
  }

  selectNext() {
    if (this.selectedQuestIndex < Object.keys(this.quests).length - 1)
      this.selectedQuestIndex++;
  }

  selectPrevious() {
    if (this.selectedQuestIndex > 0) this.selectedQuestIndex--;
  }

  resetSelection() {
    this.selectedQuestIndex = 0;
  }

  setSelectedAsCurrent() {
    if (Object.keys(this.quests).length > 0)
      this.currentQuestId = this.getSelected().id;
  }

  complete(questId) {
    if (this.quests[questId]) {
      this.quests[questId].onSucceed();
      delete this.quests[questId];
    }
  }

  fail(questId) {
    if (this.quests[questId]) {
      this.quests[questId].onFailed();
      delete this.quests[questId];
    }
  }

  static fromJSON(json) {
    return new QuestHandler(
      Object.keys(json.quests).map((key) => Quest.fromJSON(json.quests[key])),
      json.currentQuestId
    );
  }
}

class Map {
  constructor(squares, defaultSquare = "grass") {
    this.squares = squares;
    this.defaultSquare = defaultSquare;
  }

  initialize(player) {
    for (let x = 0; x < this.squares.length; x++)
      for (let y = 0; y < this.squares[x].length; y++)
        if (this.squares[x][y] === "Start") {
          this.squares[x][y] = [player];
          player.currentX = x;
          player.currentY = y;
          gameInstance.camera.currentX = x;
          gameInstance.camera.currentY = y;
        } else if (Array.isArray(this.squares[x][y])) {
          this.squares[x][y].forEach(
            (square) => (square.coordinates = { x: x, y: y })
          );
        } else if (this.squares[x][y]) {
          this.squares[x][y].coordinates = { x: x, y: y };
          this.squares[x][y] = [this.squares[x][y]];
        } else this.squares[x][y] = [];
  }

  static fromJSON(json) {
    let squares = json.squares;
    for (let x = 0; x < squares.length; x++)
      for (let y = 0; y < squares[x].length; y++)
        squares[x][y] = squares[x][y].map((layer) => squareFromJSON(layer));
    return new Map(squares, json.defaultSquare);
  }
}

class MapHandler {
  constructor(maps = defaultMaps, currentMapKey = "map") {
    this.maps = maps;
    this.currentMapKey = currentMapKey;
  }

  get currentMapSquares() {
    return this.maps[this.currentMapKey].squares;
  }

  get defaultSquare() {
    return this.maps[this.currentMapKey].defaultSquare;
  }

  initialize(player) {
    Object.values(this.maps).forEach((value) => value.initialize(player));
  }

  static fromJSON(json) {
    let maps = json.maps;
    Object.keys(maps).forEach((key) => (maps[key] = Map.fromJSON(maps[key])));
    return new MapHandler(maps, json.currentMapKey);
  }
}

let defaultMaps = {};

defaultMaps.houseMap = new Map([
  [
    new Wall(),
    new Wall(),
    new Wall(),
    new Wall(),
    new Wall(),
    new Wall(),
    new Wall(),
  ],
  [
    new Wall(),
    new Plank(),
    [new Plank(), new HealthPotion()],
    new Plank(),
    [new Plank(), new SpeedPotion()],
    new Plank(),
    new Wall(),
  ],
  [
    new Wall(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Wall(),
  ],
  [
    new Wall(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Wall(),
  ],
  [
    new Wall(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Wall(),
  ],
  [
    new Wall(),
    new Wall(),
    new Wall(),
    new HouseExit(),
    new Wall(),
    new Wall(),
    new Wall(),
  ],
]);

defaultMaps.villageShopMap = new Map([
  [
    new Wall(),
    new Wall(),
    new Wall(),
    new Wall(),
    new Wall(),
    new Wall(),
    new Wall(),
  ],
  [
    new Wall(),
    new Plank(),
    new Plank(),
    [new Plank(), new VillageShopOwner()],
    new Plank(),
    new Plank(),
    new Wall(),
  ],
  [
    new Wall(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Wall(),
  ],
  [
    new Wall(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Wall(),
  ],
  [
    new Wall(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Plank(),
    new Wall(),
  ],
  [
    new Wall(),
    new Wall(),
    new Wall(),
    new VillageShopExit(),
    new Wall(),
    new Wall(),
    new Wall(),
  ],
]);

defaultMaps.caveMap = new Map(
  [
    [
      new Rock(),
      new Rock(),
      new Rock(),
      new Rock(),
      new Rock(),
      new Rock(),
      new Rock(),
    ],
    [
      new Rock(),
      new CaveFloor(),
      new CaveFloor(),
      [new CaveFloor(), new Pickaxe()],
      new CaveFloor(),
      new CaveFloor(),
      new Rock(),
    ],
    [
      new Rock(),
      new CaveFloor(),
      new CaveFloor(),
      new CaveFloor(),
      new CaveFloor(),
      new CaveFloor(),
      new Rock(),
    ],
    [
      new Rock(),
      new CaveFloor(),
      new CaveFloor(),
      [new CaveFloor(), new Slime()],
      new CaveFloor(),
      new CaveFloor(),
      new Rock(),
    ],
    [
      new Rock(),
      new Rock(),
      new Rock(),
      new CaveFloor(),
      new Rock(),
      new Rock(),
      new Rock(),
    ],
    [null, null, new Rock(), new CaveFloor(), new Rock()],
    [null, null, new Rock(), new CaveFloor(), new Rock()],
    [null, null, new Rock(), new CaveFloor(), new Rock()],
    [null, null, new Rock(), new CaveFloor(), new Rock()],
    [null, null, new Rock(), new CaveFloor(), new Rock()],
    [null, null, new Rock(), new CaveFloor(), new Rock()],
    [null, null, new Rock(), new CaveFloor(), new Rock()],
    [null, null, new Rock(), new CaveFloor(), new Rock()],
    [null, null, new Rock(), new CaveFloor(), new Rock()],
    [null, null, new Rock(), new CaveFloor(), new Rock()],
    [null, null, new Rock(), new CaveExit(), new Rock()],
  ],
  "rock"
);

defaultMaps.map = new Map([
  [
    null,
    null,
    null,
    null,
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Stair(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
  ],
  [
    null,
    null,
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    [new CaveFloor(), new Path("CornerBottomRight")],
    [new CaveFloor(), new Path("Horizontal")],
    [new CaveFloor(), new Path("CornerTopLeft")],
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
  ],
  [
    null,
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Stair(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new CaveEntrance(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
    new Rock(),
  ],
  [],
  [],
  [],
  [null, null, null, null, null, null, null, null, null, new Slime()],
  [
    new Roof(),
    new Roof(),
    new Roof(),
    null,
    null,
    new Leaf(),
    new Leaf(),
    new Leaf(),
    null,
    null,
    new Horse(),
  ],
  [
    new Wall(),
    new Wall(),
    new Wall(),
    null,
    null,
    new Leaf(),
    new Leaf(),
    new Leaf(),
  ],
  [new Wall(), new HouseEntrance(), new Wall(), null, null, null, new Log()],
  [
    null,
    new Path("Vertical"),
    null,
    null,
    null,
    null,
    new Log(),
    null,
    null,
    new Roof(),
    new Roof(),
    new Roof(),
  ],
  [
    null,
    new Path("Vertical"),
    null,
    null,
    new StartCharacter(),
    null,
    "Start",
    null,
    null,
    new Wall("ShopSign"),
    new Wall(),
    new Wall(),
  ],
  [
    null,
    new Path("CornerTopRight"),
    new Path("Horizontal"),
    new Path("Horizontal"),
    new Path("Horizontal"),
    new Path("Horizontal"),
    new Path("Horizontal"),
    new Path("CornerBottomLeft"),
    new Slime(),
    new Wall(),
    new VillageShopEntrance(),
    new Wall(),
  ],
  [
    null,
    null,
    null,
    new Roof(),
    new Roof(),
    new Roof(),
    null,
    new Path("Vertical"),
    null,
    null,
    new Path("Vertical"),
  ],
  [
    null,
    null,
    null,
    new Wall(),
    new Wall(),
    new Wall(),
    null,
    new Path("CornerTopRight"),
    new Path("CrossBottom"),
    new Path("Horizontal"),
    new Path("CrossTop"),
    new Path("EndLeft"),
  ],
  [
    null,
    null,
    null,
    new Wall(),
    new HouseDoor(),
    new Wall(),
    null,
    null,
    new Path("Vertical"),
  ],
  [
    null,
    null,
    null,
    null,
    new Path("Vertical"),
    null,
    new Miner(),
    null,
    new Path("Vertical"),
    null,
    new Woman(),
  ],
  [
    null,
    null,
    null,
    null,
    new Path("CornerTopRight"),
    new Path("Horizontal"),
    new Path("Horizontal"),
    new Path("Horizontal"),
    new Path(),
    new Path("Horizontal"),
    new Path("EndLeft"),
  ],
  [null, null, null, null, null, null, null, null, new Path("EndTop")],
  [null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
  [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    new Water(),
    new Water(),
    null,
    null,
    null,
    new Water(),
    new Water(),
    new Water(),
  ],
  [
    null,
    null,
    null,
    null,
    null,
    null,
    new Leaf(),
    new Leaf(),
    new Leaf(),
    null,
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
  ],
  [
    null,
    null,
    null,
    null,
    null,
    null,
    new Leaf(),
    new Leaf(),
    new Leaf(),
    null,
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
  ],
  [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    new Log(),
    null,
    null,
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
    new Water(),
  ],
  [null],
  [new Leaf(), new Leaf(), new Leaf()],
  [new Leaf(), new Leaf(), new Leaf()],
  [null, new Log()],
  [null, new Log()],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [null, null, null, null, new Path(), new Path(), new Path(), new Path()],
]);

class Camera {
  movingData = { direction: null, addedDx: 0, addedDy: 0 };

  constructor(currentX = 0, currentY = 0) {
    this.currentX = currentX;
    this.currentY = currentY;
  }

  get renderX() {
    return this.currentX - halfX;
  }

  get renderY() {
    return this.currentY - halfY;
  }

  move(direction) {
    if (
      Math.abs(gameInstance.player.currentX - this.currentX) > 2 ||
      Math.abs(gameInstance.player.currentY - this.currentY) > 3
    ) {
      let movingData = { addedDx: 0, addedDy: 0, direction: direction };
      switch (direction) {
        case "up":
          this.currentX--;
          movingData.addedDx = -64;
          break;
        case "down":
          this.currentX++;
          movingData.addedDx = 64;
          break;
        case "left":
          this.currentY--;
          movingData.addedDy = -64;
          break;
        case "right":
          this.currentY++;
          movingData.addedDy = 64;
          break;
      }

      this.movingData = movingData;
    }
  }

  update() {
    if (this.movingData.direction)
      this.updateMovingData(this.movingData, gameInstance.player.speed);
  }

  updateMovingData(movingData, speed) {
    switch (movingData.direction) {
      case "up":
        movingData.addedDx = Math.min(0, movingData.addedDx + speed);
        break;
      case "down":
        movingData.addedDx = Math.max(0, movingData.addedDx - speed);
        break;
      case "left":
        movingData.addedDy = Math.min(0, movingData.addedDy + speed);
        break;
      case "right":
        movingData.addedDy = Math.max(0, movingData.addedDy - speed);
        break;
    }

    if (movingData.addedDx === 0 && movingData.addedDy === 0)
      movingData.direction = null;
  }

  static fromJSON(json) {
    return new Camera(json.currentX, json.currentY);
  }
}

class GameInstance {
  logicIntervalId = null;
  renderIntervalId = null;

  lastDirection = "left";

  keydown = null;
  waitingForKeyUp = false;

  lastInteractedSquare = null;
  currentDialog = null;
  currentShop = null;
  currentCombat = null;

  showQuests = false;
  showInventory = false;

  tick = 0;
  renderTick = 0;
  fps = 30;

  constructor(
    player = new Player(),
    mapHandler = new MapHandler(),
    questHandler = new QuestHandler(),
    camera = new Camera()
  ) {
    this.player = player;
    this.mapHandler = mapHandler;
    this.questHandler = questHandler;
    this.camera = camera;

    this.fpsCounter = new FPSCounter(this.fps);
  }

  get currentMap() {
    return this.maps[this.currentMapKey];
  }

  pause() {
    clearInterval(this.logicIntervalId);
    this.logicIntervalId = null;
  }

  unpause() {
    this.logicIntervalId = setInterval(doTick, Math.round(1000 / 128));
  }

  start() {
    this.mapHandler.initialize(this.player);

    this.renderIntervalId = setInterval(render, Math.round(1000 / this.fps));
    this.unpause();
    this.fpsCounter.start();
  }

  changeFps(fps) {
    this.fps = fps;
    clearInterval(this.renderIntervalId);
    this.renderIntervalId = setInterval(render, Math.round(1000 / this.fps));
  }

  get currentSquares() {
    return this.mapHandler.currentMapSquares;
  }

  get defaultSquare() {
    return this.mapHandler.defaultSquare;
  }

  goToMap(mapKey, x = 0, y = 0) {
    removeSquare({ x: this.player.currentX, y: this.player.currentY });
    this.mapHandler.currentMapKey = mapKey;
    addSquare({ x: x, y: y }, this.player);
    this.camera.currentX = x;
    this.camera.currentY = y;
    this.player.currentX = x;
    this.player.currentY = y;
  }

  get isPaused() {
    return !this.logicIntervalId;
  }

  static fromJSON(json) {
    return new GameInstance(
      Player.fromJSON(json.player),
      MapHandler.fromJSON(json.mapHandler),
      QuestHandler.fromJSON(json.questHandler),
      Camera.fromJSON(json.camera)
    );
  }
}

class FPSCounter {
  counterIntervalId = null;
  lastRenderTickValue = 0;

  constructor(expectedFps) {
    this.fps = expectedFps;
  }

  get isCounting() {
    return this.counterIntervalId;
  }

  start() {
    if (!this.isCounting)
      this.counterIntervalId = setInterval(() => {
        this.fps = gameInstance.renderTick - this.lastRenderTickValue;
        this.lastRenderTickValue = gameInstance.renderTick;
      }, 1000);
  }

  stop() {
    clearInterval(this.counterIntervalId);
    this.counterIntervalId = null;
  }
}

class Combat {
  entityIndex = 0;

  constructor(allies, enemies, isAlliesTurn = true) {
    this.allies = allies;
    this.enemies = enemies;
    this.isAlliesTurn = isAlliesTurn;
  }

  get currentEntity() {
    return this.isAlliesTurn
      ? this.allies[this.entityIndex]
      : this.enemies[this.entityIndex];
  }

  endTurn() {
    if (this.isAlliesTurn && this.entityIndex === this.allies.length - 1) {
      this.isAlliesTurn = false;
      this.entityIndex = 0;
    } else if (
      !this.isAlliesTurn &&
      this.entityIndex === this.enemies.length - 1
    ) {
      this.isAlliesTurn = true;
      this.entityIndex = 0;
    } else this.entityIndex++;
  }

  removeEntity(entity) {
    this.allies = this.allies.filter((ally) => ally !== entity);
    this.enemies = this.enemies.filter((enemy) => enemy !== entity);
  }

  get hasEnded() {
    return this.allies.length === 0 || this.enemies.length === 0;
  }
}

let gameInstance = new GameInstance();

document.addEventListener("keydown", function onPress(event) {
  switch (event.key) {
    case "w":
      if (gameInstance.isPaused)
        saveFile("rpg-save-file.sav", btoa(JSON.stringify(gameInstance)));
      break;
    case "x":
      if (gameInstance.isPaused)
        uploadFile((file) =>
          readFile(
            file,
            (content) =>
              (gameInstance = GameInstance.fromJSON(JSON.parse(atob(content))))
          )
        );
      break;
    case "p":
      if (gameInstance.isPaused) gameInstance.unpause();
      else gameInstance.pause();
      break;
    default:
      gameInstance.keydown = event.key;
      break;
  }
});

document.addEventListener("keyup", function onPress(event) {
  if (event.key === gameInstance.keydown) {
    gameInstance.keydown = null;
    gameInstance.waitingForKeyUp = false;
  }
});

let types = {
  Square: Square,
  HealthPotion: HealthPotion,
  SpeedPotion: SpeedPotion,
  MapAccessSquare: MapAccessSquare,
  ShopOwner: ShopOwner,
  Weapon: Weapon,
  Slime: Slime,
  Mount: Mount,
  Talkable: Talkable,
  Miner: Miner,
  SimpleArmor: SimpleArmor,
};

function squareFromJSON(json) {
  if (!json) return null;
  else if (!json.type) {
    console.warn("No type found for :", json);
    return null;
  } else if (!(json.type in types)) {
    console.warn(`${json.type} not found in types`);
    return null;
  }
  return types[json.type].fromJSON(json);
}

function action(direction) {
  let currentCoordinates = {
    x: gameInstance.player.currentX,
    y: gameInstance.player.currentY,
  };
  let player = gameInstance.player;
  let nextCoordinates = getCoordinates(
    direction,
    currentCoordinates.x,
    currentCoordinates.y
  );
  let nextSquare = getSquare(nextCoordinates);
  let waitForKeyUp = true;

  gameInstance.currentDialog = null;
  if (direction === "left" || direction === "right")
    gameInstance.lastDirection = direction;

  if (nextSquare && !player.mount) {
    let health = nextSquare.health;
    if (health > 0) {
      nextSquare.applyDamage(player.attack);
      player.attacking = 32;
      if (nextSquare.health <= 0 && nextSquare.drop)
        replaceSquare(nextCoordinates, nextSquare.drop);
      else if (nextSquare.health <= 0) removeSquare(nextCoordinates);
    }

    if (nextSquare.canBePicked) {
      player.pick(nextSquare);
      removeSquare(nextCoordinates);
    }

    waitForKeyUp = nextSquare.action(currentCoordinates, nextCoordinates);
  }

  if (!nextSquare || nextSquare.walkable) {
    move(direction);
    waitForKeyUp = false;
  }

  gameInstance.lastInteractedSquare = nextSquare;
  gameInstance.waitingForKeyUp = waitForKeyUp;
}

function move(direction) {
  gameInstance.player.move(direction);
  gameInstance.camera.move(direction);
  switch (direction) {
    case "left":
      gameInstance.lastDirection = direction;
      break;
    case "right":
      gameInstance.lastDirection = direction;
      break;
  }
}

function getMovingData(direction) {
  let movingData = { addedDx: 0, addedDy: 0, direction: direction };
  switch (direction) {
    case "up":
      movingData.addedDx = 64;
      break;
    case "down":
      movingData.addedDx = -64;
      break;
    case "left":
      movingData.addedDy = 64;
      break;
    case "right":
      movingData.addedDy = -64;
      break;
  }
  return movingData;
}

function updateMovingData(movingData, speed) {
  switch (movingData.direction) {
    case "up":
      movingData.addedDx = Math.max(0, movingData.addedDx - speed);
      break;
    case "down":
      movingData.addedDx = Math.min(0, movingData.addedDx + speed);
      break;
    case "left":
      movingData.addedDy = Math.max(0, movingData.addedDy - speed);
      break;
    case "right":
      movingData.addedDy = Math.min(0, movingData.addedDy + speed);
      break;
  }

  if (movingData.addedDx === 0 && movingData.addedDy === 0)
    movingData.direction = null;
}

function applyToVisibleSquares(callback) {
  for (let x = -1; x < renderingMaxX; x++) {
    for (let y = -1; y < renderingMaxY; y++) {
      callback(
        getSquare({
          x: x + gameInstance.camera.renderX,
          y: y + gameInstance.camera.renderY,
        }),
        x,
        y
      );
    }
  }
}

function pickDialog(index) {
  let lastInteractedSquare = gameInstance.lastInteractedSquare;
  if (lastInteractedSquare && lastInteractedSquare.chooseOption)
    lastInteractedSquare.chooseOption(index);

  gameInstance.waitingForKeyUp = true;
}

function getRandomElement(array) {
  return array[getRandomInteger(0, array.length - 1)];
}

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getSessionRandomElement(array) {
  return array[getSessionRandomInteger(array.length - 1)];
}

function getSessionRandomInteger(max) {
  return seed % (max + 1);
}

function getCoordinatesRandomInteger(max, x, y) {
  return (((Math.tan(x) * seed) / Math.cos(y)) * x) % (max + 1);
}

function saveFile(filename, data) {
  const blob = new Blob([data], { type: "application/json" });
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveBlob(blob, filename);
  } else {
    const element = window.document.createElement("a");
    element.href = window.URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}

function uploadFile(onFileLoaded) {
  const input = window.document.createElement("input");
  input.type = "file";
  input.accept = ".sav";
  input.style.display = "none";
  input.onchange = () => onFileLoaded(input.files[0]);
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}

function readFile(file, onFileRead) {
  var reader = new FileReader();
  reader.readAsText(file);
  reader.onload = (event) => onFileRead(event.target.result);
}

function splitForWidth(text, maxWidth) {
  let ellipseWidth = context.measureText("...").width;
  let textWidth = context.measureText(text).width;
  let splitCount = Math.ceil(textWidth / (maxWidth - ellipseWidth));
  let splitLength = Math.round(text.length / splitCount);
  let strings = [],
    substring,
    currentSplit = 1;

  for (let i = 0; i < text.length; i += splitLength) {
    substring = text.substring(i, i + splitLength);
    if (
      substring.charAt(substring.length - 1) !== " " &&
      currentSplit !== splitCount
    )
      substring += "...";
    strings.push(substring);
    currentSplit++;
  }

  return strings;
}

function splitForWidthPrecise(text, maxWidth) {
  let strings = [],
    start = 0,
    end = 0,
    textWidth,
    substring;
  let ellipseWidth = context.measureText("...").width;
  while (end < text.length) {
    substring = text.substring(start, end);
    textWidth = context.measureText(substring).width + ellipseWidth;
    if (textWidth > maxWidth) {
      substring = text.substring(start, end - 1);
      if (substring.charAt(substring.length - 1) !== " ") substring += "...";
      strings.push(substring);
      start = end - 1;
      end = start;
    }
    end++;
  }
  strings.push(text.substring(start, end));
  return strings;
}

function renderDialog(dialog) {
  let text;
  if (Array.isArray(dialog.text)) text = getSessionRandomElement(dialog.text);
  else text = dialog.text;

  context.fillStyle = "white";
  context.fillRect(64, 64 * 8, 64 * 10, 64);
  context.fillStyle = "black";
  context.font = fonts.small;

  let baseDy = 64 * 8 + 14;
  context.fillText(text, 64 + 2, baseDy);
  baseDy += 14;

  if (dialog.options)
    dialog.options.forEach((option, index) => {
      if (option.available && !option.available()) context.fillStyle = "grey";
      else context.fillStyle = "black";

      context.fillText(`${index + 1}. ${option.text}`, 64 + 2, baseDy);
      baseDy += 14;
    });
}

function getSquare(coordinates, ignorePlayer = false) {
  let currentMap = gameInstance.currentSquares,
    square = null;
  if (
    ignorePlayer &&
    currentMap[coordinates.x] &&
    (square = currentMap[coordinates.x][coordinates.y]) &&
    square.length > 1
  )
    return square[square.length - 2];
  else if (
    !ignorePlayer &&
    currentMap[coordinates.x] &&
    (square = currentMap[coordinates.x][coordinates.y])
  )
    return square[square.length - 1];
  return null;
}

function removeSquare(coordinates, ignorePlayer = false) {
  let currentMap = gameInstance.currentSquares;
  if (ignorePlayer) {
    let squares = currentMap[coordinates.x][coordinates.y];
    return squares.splice(squares.length - 2, 1)[0];
  }
  return currentMap[coordinates.x][coordinates.y].pop();
}

function replaceSquare(coordinates, newSquare) {
  let currentMap = gameInstance.currentSquares;
  let replacedSquare = currentMap[coordinates.x][coordinates.y].pop();
  currentMap[coordinates.x][coordinates.y].push(newSquare);
  return replacedSquare;
}

function addSquare(coordinates, newSquare) {
  let currentMap = gameInstance.currentSquares;
  if (!currentMap[coordinates.x][coordinates.y])
    currentMap[coordinates.x][coordinates.y] = [];
  currentMap[coordinates.x][coordinates.y].push(newSquare);
}

function moveSquare(coordinates, newCoordinates) {
  let square = removeSquare(coordinates);
  addSquare(newCoordinates, square);
  return newCoordinates;
}

function moveSquareByDirection(direction, x, y) {
  let newCoordinates = getCoordinates(direction, x, y);
  return moveSquare({ x: x, y: y }, newCoordinates);
}

function getCurrentCoordinates() {
  return {
    x: gameInstance.player.currentX,
    y: gameInstance.player.currentY,
  };
}

function getCoordinates(
  direction,
  x = gameInstance.player.currentX,
  y = gameInstance.player.currentY
) {
  switch (direction) {
    case "up":
      x--;
      break;
    case "down":
      x++;
      break;
    case "left":
      y--;
      break;
    case "right":
      y++;
      break;
  }

  return { x: x, y: y };
}

function render() {
  let player = gameInstance.player;
  if (player.health > 0) {
    for (let x = -1; x < renderingMaxX; x++) {
      for (let y = -1; y < renderingMaxY; y++) {
        renderCoordinates(gameInstance.currentSquares, x, y);
      }
    }

    for (let x = -1; x < renderingMaxX; x++) {
      for (let y = -1; y < renderingMaxY; y++) {
        renderCoordinates(gameInstance.currentSquares, x, y, false);
      }
    }

    renderHud();

    if (gameInstance.currentDialog) renderDialog(gameInstance.currentDialog);
    if (gameInstance.showInventory) renderInventory();
    if (gameInstance.currentShop) renderShop();
    if (gameInstance.showQuests) renderQuests();
    if (gameInstance.isPaused) renderPause();

    renderFPS();
  } else renderDeath();

  gameInstance.renderTick++;
}

function doTick() {
  if (
    !gameInstance.waitingForKeyUp &&
    !gameInstance.player.movingData.direction
  ) {
    switch (gameInstance.keydown) {
      case "z":
        if (
          !gameInstance.showInventory &&
          !gameInstance.currentShop &&
          !gameInstance.showQuests
        )
          action("up");
        break;
      case "s":
        if (
          !gameInstance.showInventory &&
          !gameInstance.currentShop &&
          !gameInstance.showQuests
        )
          action("down");
        break;
      case "q":
        if (
          !gameInstance.showInventory &&
          !gameInstance.currentShop &&
          !gameInstance.showQuests
        )
          action("left");
        else if (gameInstance.showInventory) {
          gameInstance.player.inventory.selectPrevious();
          gameInstance.waitingForKeyUp = true;
        } else if (gameInstance.showQuests) {
          gameInstance.questHandler.selectPrevious();
          gameInstance.waitingForKeyUp = true;
        } else {
          gameInstance.currentShop.selectPrevious();
          gameInstance.waitingForKeyUp = true;
        }
        break;
      case "d":
        if (
          !gameInstance.showInventory &&
          !gameInstance.currentShop &&
          !gameInstance.showQuests
        )
          action("right");
        else if (gameInstance.showInventory) {
          gameInstance.player.inventory.selectNext();
          gameInstance.waitingForKeyUp = true;
        } else if (gameInstance.showQuests) {
          gameInstance.questHandler.selectNext();
          gameInstance.waitingForKeyUp = true;
        } else {
          gameInstance.currentShop.selectNext();
          gameInstance.waitingForKeyUp = true;
        }
        break;
      case "&":
        pickDialog(0);
        gameInstance.waitingForKeyUp = true;
        break;
      case "é":
        pickDialog(1);
        gameInstance.waitingForKeyUp = true;
        break;
      case '"':
        pickDialog(2);
        gameInstance.waitingForKeyUp = true;
        break;
      case "'":
        pickDialog(3);
        gameInstance.waitingForKeyUp = true;
        break;
      case "(":
        pickDialog(4);
        gameInstance.waitingForKeyUp = true;
        break;
      case "§":
        pickDialog(5);
        gameInstance.waitingForKeyUp = true;
        break;
      case "i":
        gameInstance.showInventory = !gameInstance.showInventory;
        gameInstance.waitingForKeyUp = true;
        break;
      case "y":
        gameInstance.showQuests = !gameInstance.showQuests;
        gameInstance.waitingForKeyUp = true;
        break;
      case "h":
        gameInstance.player.use("healthPotion");
        gameInstance.waitingForKeyUp = true;
        break;
      case "u":
        if (gameInstance.showInventory) {
          gameInstance.player.inventory.useSelected(gameInstance.player);
          gameInstance.waitingForKeyUp = true;
        } else if (gameInstance.showQuests) {
          gameInstance.questHandler.setSelectedAsCurrent();
          gameInstance.waitingForKeyUp = true;
        }
        break;
      case "b":
        if (gameInstance.currentShop) gameInstance.currentShop.buySelected();
        gameInstance.waitingForKeyUp = true;
        break;
      case "m":
        let currentCoordinates = getCurrentCoordinates();
        let currentSquare = getSquare(currentCoordinates, true);
        if (currentSquare && currentSquare.isMount) {
          removeSquare(currentCoordinates, true);
          gameInstance.player.climb(currentSquare);
        }
        gameInstance.waitingForKeyUp = true;
        break;
      case "Escape":
        gameInstance.showInventory = false;
        gameInstance.currentShop = null;
        gameInstance.showQuests = false;
        gameInstance.player.dismount();
        break;
    }
  }

  if (gameInstance.player.health <= 0) {
    setTimeout(() => {
      document.location.reload();
    }, 1000 * 5);
  }

  applyToVisibleSquares((square, x, y) => {
    if (square) {
      square.update();

      if (gameInstance.tick % 256 === 0)
        square.autoAction(
          x + gameInstance.camera.renderX,
          y + gameInstance.camera.renderY
        );
    }
  });

  gameInstance.camera.update();

  gameInstance.tick++;
}

function renderCoordinates(currentMap, x, y, background = true) {
  let square = [];
  if (
    currentMap[x + gameInstance.camera.renderX] &&
    currentMap[x + gameInstance.camera.renderX][y + gameInstance.camera.renderY]
  )
    square =
      currentMap[x + gameInstance.camera.renderX][
        y + gameInstance.camera.renderY
      ];
  let dx = x * 64,
    dy = y * 64;
  let addedDx = gameInstance.camera.movingData.addedDx,
    addedDy = gameInstance.camera.movingData.addedDy;
  if (
    background &&
    ((square.length > 0 && square[0].transparent) || square.length === 0)
  ) {
    let defaultSquare = gameInstance.defaultSquare;
    if (
      defaultSquare === "grass" &&
      getCoordinatesRandomInteger(
        1,
        x + gameInstance.camera.renderX,
        y + gameInstance.camera.renderY
      ) === 1
    )
      defaultSquare = "grass1";
    renderSquare({ renderId: defaultSquare }, dx + addedDx, dy + addedDy);
  }
  if (background && square.length > 0)
    square.forEach((layer) => {
      if (!layer.movingData) renderSquare(layer, dx + addedDx, dy + addedDy);
    });
  else if (square.length > 0)
    square.forEach((layer) => {
      if (layer.movingData) renderSquare(layer, dx + addedDx, dy + addedDy);
    });
}

function renderSquare(square, dx, dy) {
  if (square.movingData) {
    dx += square.movingData.addedDx;
    dy += square.movingData.addedDy;
  }

  drawSquare(square.renderId, dx, dy, square.height, square.width);

  if (square && square.postRender) square.postRender(dx, dy);
}

function drawSquare(id, dx, dy, height = 64, width = 64) {
  dx += Math.round((64 - height) / 2);
  dy += Math.round((64 - width) / 2);

  draw(id, dx, dy, height, width);
}

function draw(id, dx, dy, height = 64, width = 64) {
  try {
    context.drawImage(assetsElements[id], dy, dx, width, height);
  } catch {
    console.warn(`Missing texture : ${id}`);
    context.drawImage(assetsElements["missing"], dy, dx, width, height);
  }
}

function renderHud() {
  let player = gameInstance.player;
  context.fillStyle = "white";
  context.fillRect(16, 16, 128, 32);
  context.fillStyle = "white";
  context.fillRect(160, 16, 264, 32);
  context.fillStyle = "white";
  context.fillRect(440, 16, 264, 32);

  context.fillStyle = "black";
  context.font = fonts.medium;
  context.fillText(`HP : ${player.health}`, 16 + 1, 16 + 24);

  context.fillStyle = "black";
  context.font = fonts.medium;
  let itemText;
  if (player.hand && player.hand.damage)
    itemText = `Hand : ${player.hand.name} (dmg: ${player.hand.damage})`;
  else if (player.hand) itemText = `Hand : ${player.hand.name}`;
  else itemText = "Hand : Nothing";
  context.fillText(itemText, 160 + 1, 16 + 24);

  context.fillStyle = "black";
  context.font = fonts.medium;
  context.fillText(`Money : ${player.money}`, 440 + 1, 16 + 24);
}

function renderInventory() {
  context.fillStyle = "white";
  context.fillRect(128, 128, width - 256, 256);

  let text = "Inventory";
  let selectedItem = gameInstance.player.inventory.getSelected();
  if (selectedItem) {
    text += ` - ${selectedItem.name}`;
    context.fillStyle = "black";
    context.font = fonts.small;
    context.fillText(selectedItem.description, 132, 168);
  }

  context.fillStyle = "black";
  context.font = fonts.medium;
  context.fillText(text, 132, 128 + 24);

  gameInstance.player.inventory.items.forEach((item, index) => {
    if (
      index === gameInstance.player.inventory.selectedIndex &&
      gameInstance.tick % 128 < 64
    ) {
      context.fillStyle = "lightgrey";
      context.fillRect(128 + index * 32, 128 + 48, item.height, item.width);
    }

    draw(item.id, 128 + 48, 128 + index * 32, item.height, item.width);
  });
}

function renderShop() {
  let currentShop = gameInstance.currentShop;
  context.fillStyle = "white";
  context.fillRect(128, 128, width - 256, 256);

  let text = currentShop.name;
  let selectedItem = currentShop.getSelected();
  if (selectedItem) {
    text += ` - ${selectedItem.item.name}`;
    context.fillStyle = "black";
    context.font = fonts.small;
    context.fillText(
      `Cost ${selectedItem.price} - ${selectedItem.item.description}`,
      132,
      168
    );
  }

  context.fillStyle = "black";
  context.font = fonts.medium;
  context.fillText(text, 132, 128 + 24);

  currentShop.items.forEach((shopItem, index) => {
    if (index === currentShop.selectedIndex && gameInstance.tick % 128 < 64) {
      context.fillStyle = "lightgrey";
      context.fillRect(
        128 + index * 32,
        128 + 48,
        shopItem.item.height,
        shopItem.item.width
      );
    }
    draw(
      shopItem.item.id,
      128 + 48,
      128 + index * 32,
      shopItem.item.height,
      shopItem.item.width
    );
  });
}

function renderQuests() {
  context.fillStyle = "white";
  context.fillRect(128, 128, width - 256, height - 265);

  let text = "Quests";
  let currentQuest = gameInstance.questHandler.getCurrent();
  let currentHeight = 164;
  if (currentQuest) {
    text += ` - Current : ${currentQuest.name}`;

    context.fillStyle = "black";
    context.font = fonts.small;
    let splittedText = splitForWidth(currentQuest.description, width - 266);
    splittedText.forEach((line) => {
      context.fillText(line, 138, currentHeight + 14);
      currentHeight += 16;
    });
    currentHeight += 12;
  }

  context.fillStyle = "black";
  context.font = fonts.medium;
  context.fillText(text, 132, 128 + 24);

  Object.keys(gameInstance.questHandler.quests).forEach((key, index) => {
    let quest = gameInstance.questHandler.quests[key];

    if (
      index === gameInstance.questHandler.selectedQuestIndex &&
      gameInstance.tick % 128 < 64
    ) {
      context.fillStyle = "lightgrey";
      context.fillRect(128, currentHeight + 5, width - 256, 24);
    }

    context.fillStyle = "black";
    context.font = fonts.medium;
    context.fillText(quest.name, 132, currentHeight + 24);
    currentHeight += 32;

    context.fillStyle = "black";
    context.font = fonts.small;
    let splittedText = splitForWidth(quest.description, width - 266);
    splittedText.forEach((line) => {
      context.fillText(line, 138, currentHeight + 14);
      currentHeight += 16;
    });
    currentHeight += 6;
  });
}

function renderPause() {
  let pauseMessage = "PAUSED";

  context.fillStyle = "black";
  context.font = fonts.large;
  let messageWidth = context.measureText(pauseMessage).width;
  context.fillText(pauseMessage, halfWidth - messageWidth / 2, halfHeight);

  context.font = fonts.small;
  let commandMessage = "w - save game, x - load game";
  messageWidth = context.measureText(commandMessage).width;

  context.fillStyle = "white";
  context.fillRect(
    width - messageWidth - 20,
    height - 34,
    messageWidth + 20,
    34
  );

  context.fillStyle = "black";
  context.font = fonts.small;
  context.fillText(commandMessage, width - messageWidth - 10, height - 10);
}

function renderError(message) {
  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "red";
  context.font = fonts.large;
  context.fillText(message, 0, 32);
}

function renderDeath() {
  let deathMessage = "YOU DIED";

  context.fillStyle = "black";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "darkred";
  context.font = fonts.large;
  let messageWidth = context.measureText(deathMessage).width;
  context.fillText(deathMessage, halfWidth - messageWidth / 2, halfHeight);
}

function renderMap() {
  context.fillStyle = "white";
  context.fillRect(128, 128, width - 256, 256);

  let square,
    squares = gameInstance.currentSquares;
  for (let x = 0; x < squares.length; x++) {
    for (let y = 0; y < squares[x].length; y++) {
      square = squares[x][y];
      if (
        square &&
        square.length > 0 &&
        square[square.length - 1].transparent
      ) {
        draw("grass", 132 + x * 8, 132 + y * 8, 8, 8);
        square.forEach((layer) =>
          draw(layer.id, 132 + x * 8, 132 + y * 8, 8, 8)
        );
      } else if (square && square.length > 0)
        square.forEach((layer) =>
          draw(layer.id, 132 + x * 8, 132 + y * 8, 8, 8)
        );
      else draw("grass", 132 + x * 8, 132 + y * 8, 8, 8);
    }
  }
}

function renderFPS() {
  context.fillStyle = "black";
  context.font = fonts.small;
  context.fillText(`${gameInstance.fpsCounter.fps} FPS`, 0, 14);
}

function main() {
  gameInstance.player.money = 30;
  gameInstance.player.inventory.add(new HealthPotion(), new SpeedPotion());

  gameInstance.start();
}

const assets = [
  "axe.png",
  "axeRight.png",
  "character.png",
  "slime.png",
  "slime1.png",
  "slimeDamaged.png",
  "grass.png",
  "grass1.png",
  "heart.png",
  "houseDoor.png",
  "leaf.png",
  "log.png",
  "money.png",
  "path.png",
  "pathVertical.png",
  "pathHorizontal.png",
  "pathCrossTop.png",
  "pathCrossBottom.png",
  "pathCrossRight.png",
  "pathCrossLeft.png",
  "pathEndTop.png",
  "pathEndBottom.png",
  "pathEndRight.png",
  "pathEndLeft.png",
  "pathCornerTopRight.png",
  "pathCornerTopLeft.png",
  "pathCornerBottomRight.png",
  "pathCornerBottomLeft.png",
  "plank.png",
  "rock.png",
  "roof.png",
  "stair.png",
  "sword.png",
  "sword1.png",
  "sword2.png",
  "swordRight.png",
  "sword1Right.png",
  "sword2Right.png",
  "wall.png",
  "wallShopSign.png",
  "woman.png",
  "caveEntrance.png",
  "caveFloor.png",
  "player.png",
  "player1.png",
  "player2.png",
  "playerDamaged.png",
  "playerRight.png",
  "player1Right.png",
  "player2Right.png",
  "playerDamagedRight.png",
  "playerHorse.png",
  "playerHorse1.png",
  "playerHorse2.png",
  "playerHorseRight.png",
  "playerHorse1Right.png",
  "playerHorse2Right.png",
  "healthPotion.png",
  "speedPotion.png",
  "villageShopOwner.png",
  "horse.png",
  "armor.png",
  "pickaxe.png",
  "pickaxeRight.png",
  "miner.png",
  "water.png",
  "missing.png",
];

const assetsElements = {};

let loadingMessage = "Loading...";
context.fillStyle = "black";
context.font = fonts.large;
let messageWidth = context.measureText(loadingMessage).width;
context.fillText(loadingMessage, halfWidth - messageWidth / 2, halfHeight);

let loadedCount = 0;
assets.forEach((asset) => {
  let img = document.createElement("img");
  img.id = asset.split(".")[0];
  img.onload = () => {
    loadedCount++;
    if (loadedCount === assets.length) main();
  };
  img.onerror = () => renderError(`Unable to get asset : ${asset}`);
  img.src = `./assets/${asset}`;
  document.body.appendChild(img);
  assetsElements[img.id] = img;
});
