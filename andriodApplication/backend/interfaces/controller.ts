export class ControllerError extends Error {
  statusCode: number;
  details?: string;

  constructor(statusCode: number, message: string, details?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = "ControllerError";
    Object.setPrototypeOf(this, ControllerError.prototype);
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      name: this.name,
      message: this.message,
      details: this.details,
    };
  }
}

export class ControllerSuccess {
  success: boolean;
  message: string;
  details?: any;

  constructor(message: string, details?: any) {
    this.success = true;
    this.message = message;
    this.details = details;
  }

  toJSON() {
    return {
      success: this.success,
      message: this.message,
      details: this.details,
    };
  }
}
