/** An error with a message that is safe to show to the person. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export const deny = (message = "You do not have permission to do that.") => new HttpError(403, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const bad = (message: string) => new HttpError(400, message);
