export default class Collectible {
  constructor({ x = 0, y = 0, value = 1, id } = {}) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.id = id;
  }
}
