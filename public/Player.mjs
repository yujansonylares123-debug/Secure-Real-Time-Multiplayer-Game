export default class Player {
  constructor({ x = 0, y = 0, score = 0, id } = {}) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.id = id;
  }

  // movePlayer(str, num) ajusta la posición
  movePlayer(direction, amount = 1) {
    switch (direction) {
      case 'right':
        this.x += amount;
        break;
      case 'left':
        this.x -= amount;
        break;
      case 'up':
        this.y -= amount;
        break;
      case 'down':
        this.y += amount;
        break;
    }
  }

  // collision(obj) => true si misma posición
  collision(obj) {
    return this.x === obj.x && this.y === obj.y;
  }

  // calculateRank(arr) => "Rank: X / N"
  calculateRank(playersArr) {
    if (!Array.isArray(playersArr) || playersArr.length === 0) {
      return 'Rank: 0 / 0';
    }

    // ordenar por score desc
    const sorted = [...playersArr].sort((a, b) => (b.score || 0) - (a.score || 0));
    const index = sorted.findIndex((p) => p.id === this.id);

    const rank = index === -1 ? playersArr.length : index + 1;
    const total = playersArr.length;

    return `Rank: ${rank} / ${total}`;
  }
}
