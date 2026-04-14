export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const notFound = (resource: string) =>
  new AppError(404, `${resource} introuvable`)

export const forbidden = () =>
  new AppError(403, 'Accès non autorisé')

export const badRequest = (msg: string) =>
  new AppError(400, msg)

export const conflict = (msg: string) =>
  new AppError(409, msg)
