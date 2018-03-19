class BaseError extends Error {

  constructor(
    public message: string,
    public status?: number | HttpStatusCode
  ) {

    super(message); // Calling parent constructor of base Error class.
    this.name = this.constructor.name; // Saving class name in the property of our custom error as a shortcut.
    this.status = status || 500;
    Error.captureStackTrace(this, this.constructor); // Capturing stack trace, excluding constructor call from it.

    // You can use any additional properties you want.
    // eg
    // this.fields = getFieldsThatHaveErrors()
    // this.shouldLog = false
    // this.lastOperation = UserJourney.UserTriedToCheckout
  }
}

export class InvalidUserError extends BaseError {
  constructor() {
    super('Invalid or No User. Please login.', HttpStatusCode.UNAUTHORIZED);
  }
}

export class AuthenticationError extends BaseError {
  constructor() {
    super('You cannot access this resource. You shall not pass.', HttpStatusCode.FORBIDDEN);
  }
}

export class ComicNotFoundError extends BaseError {
  constructor(public query?: string) {
    super(`Could not find comic${query ? ` (${query})` : ''}`, HttpStatusCode.NOT_FOUND);
  }
}