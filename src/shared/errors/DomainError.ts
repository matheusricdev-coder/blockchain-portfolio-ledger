export class DomainError extends Error {
  public readonly name: string;

  constructor(message: string, name: string) {
    super(message);
    this.name = name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
