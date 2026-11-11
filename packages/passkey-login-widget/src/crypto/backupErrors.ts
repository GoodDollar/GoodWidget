/** The backup JSON is malformed, has an unknown version, or carries an invalid address. Maps to D6. */
export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupFormatError'
  }
}

/** The backup could not be decrypted, or the decrypted key does not match the stored address. Maps to D6. */
export class BackupDecryptError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupDecryptError'
  }
}
