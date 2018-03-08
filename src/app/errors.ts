
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
    super('Invalid or No User. Please login.', HttpStatusCode.FORBIDDEN);
  }
}

export class AuthenticationError extends BaseError {
  constructor() {
    super('Unauthorized. You shall not pass.', HttpStatusCode.UNAUTHORIZED);
  }
}

export class ComicNotFoundError extends BaseError {
  constructor() {
    super('Could not find comic', HttpStatusCode.NOT_FOUND);
  }
}