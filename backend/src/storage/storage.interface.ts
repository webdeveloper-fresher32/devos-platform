export interface IStorageProvider {
  uploadFile(key: string, file: Buffer, mimeType: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFileUrl(key: string): Promise<string>;
}
