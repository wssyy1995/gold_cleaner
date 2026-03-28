/**
 * UploadTool 图片上传工具
 * 负责将本地图片上传到微信云存储
 */

import CloudStorage from './CloudStorage';
import { globalEvent } from '../core/EventEmitter';

// 自动扫描配置
const SCAN_CONFIG = {
  // 根目录
  rootDir: 'images',
  // 支持的图片格式
  extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'],
  // 忽略的目录（可选）
  excludeDirs: ['temp', 'cache', '.DS_Store'],
  // 忽略的文件前缀（可选）
  excludePrefixes: ['.', '_']
};

class UploadTool {
  constructor() {
    this.cloudStorage = new CloudStorage();
    this.isUploading = false;
    this.uploadQueue = [];
    this.uploadedFiles = [];  // 已上传文件记录
    this.failedFiles = [];    // 上传失败文件记录
    this.progress = {
      total: 0,
      completed: 0,
      current: ''
    };
  }

  /**
   * 初始化
   */
  async init() {
    await this.cloudStorage.init();
    console.log('[UploadTool] 初始化完成');
  }

  /**
   * 扫描并获取所有需要上传的图片列表
   * 自动扫描 images/ 目录下所有图片（包括子目录）
   */
  async scanImages() {
    // 检查微信环境
    if (typeof wx === 'undefined') {
      console.warn('[UploadTool] 非微信环境，无法扫描图片');
      return [];
    }
    
    console.log('[UploadTool] 开始扫描 images/ 目录...');
    
    const imagesToUpload = [];
    
    try {
      // 递归扫描 images 目录
      const scannedImages = await this._scanDirectory(SCAN_CONFIG.rootDir);
      
      for (const imgPath of scannedImages) {
        imagesToUpload.push({
          localPath: imgPath,
          cloudPath: imgPath,
          exists: true
        });
      }
      
      console.log(`[UploadTool] 扫描完成，找到 ${imagesToUpload.length} 个图片文件`);
      
      // 打印扫描结果摘要
      this._printScanSummary(imagesToUpload);
      
    } catch (e) {
      console.warn('[UploadTool] 扫描目录失败:', e);
    }
    
    return imagesToUpload;
  }
  
  /**
   * 打印扫描结果摘要
   */
  _printScanSummary(images) {
    // 按目录分组统计
    const stats = {};
    for (const img of images) {
      const dir = img.localPath.substring(0, img.localPath.lastIndexOf('/')) || 'root';
      stats[dir] = (stats[dir] || 0) + 1;
    }
    
    console.log('[UploadTool] 扫描结果分布:');
    for (const [dir, count] of Object.entries(stats).sort()) {
      console.log(`  ${dir}: ${count} 个文件`);
    }
  }

  /**
   * 递归扫描目录
   * @param {string} dir - 目录路径
   * @returns {Promise<string[]>} 图片文件路径列表
   */
  async _scanDirectory(dir) {
    const fs = wx.getFileSystemManager();
    const images = [];
    
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        // 跳过隐藏文件和特定前缀
        if (SCAN_CONFIG.excludePrefixes.some(prefix => file.startsWith(prefix))) {
          continue;
        }
        
        const fullPath = `${dir}/${file}`;
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // 跳过排除的目录
            if (SCAN_CONFIG.excludeDirs.includes(file)) {
              console.log(`[UploadTool] 跳过排除目录: ${fullPath}`);
              continue;
            }
            
            // 递归扫描子目录
            const subImages = await this._scanDirectory(fullPath);
            images.push(...subImages);
            
          } else if (this._isImageFile(file)) {
            images.push(fullPath);
          }
          
        } catch (e) {
          // 跳过无法访问的文件
        }
      }
      
    } catch (e) {
      console.warn(`[UploadTool] 无法读取目录: ${dir}`, e.message);
    }
    
    return images;
  }
  
  /**
   * 检查文件是否为图片
   * @param {string} filename - 文件名
   * @returns {boolean}
   */
  _isImageFile(filename) {
    const lowerName = filename.toLowerCase();
    return SCAN_CONFIG.extensions.some(ext => lowerName.endsWith(ext));
  }

  /**
   * 开始上传所有图片
   * @param {Function} onProgress - 进度回调 (current, total, fileName)
   * @param {Function} onComplete - 完成回调 (success, failed)
   */
  async startUpload(onProgress = null, onComplete = null) {
    if (this.isUploading) {
      console.warn('[UploadTool] 正在上传中...');
      return { success: false, error: 'uploading_in_progress' };
    }

    this.isUploading = true;
    this.uploadedFiles = [];
    this.failedFiles = [];

    try {
      // 确保已初始化
      if (!this.cloudStorage.isInitialized()) {
        await this.init();
      }

      // 获取上传列表
      this.uploadQueue = await this.scanImages();
      this.progress.total = this.uploadQueue.length;
      this.progress.completed = 0;

      if (this.uploadQueue.length === 0) {
        this.isUploading = false;
        if (onComplete) onComplete([], []);
        return { success: true, uploaded: [], failed: [], message: '没有需要上传的文件' };
      }

      console.log(`[UploadTool] 开始上传 ${this.uploadQueue.length} 个文件...`);

      // 逐个上传（避免并发过高）
      for (let i = 0; i < this.uploadQueue.length; i++) {
        const item = this.uploadQueue[i];
        this.progress.current = item.localPath;
        
        if (onProgress) {
          onProgress(i + 1, this.progress.total, item.localPath);
        }

        globalEvent.emit('upload:progress', {
          current: i + 1,
          total: this.progress.total,
          file: item.localPath
        });

        try {
          const result = await this._uploadSingleFile(item);
          if (result.success) {
            this.uploadedFiles.push({
              localPath: item.localPath,
              cloudPath: item.cloudPath,
              fileID: result.fileID
            });
          } else {
            this.failedFiles.push({
              localPath: item.localPath,
              error: result.error
            });
          }
        } catch (e) {
          this.failedFiles.push({
            localPath: item.localPath,
            error: e.message
          });
        }

        this.progress.completed = i + 1;
        
        // 小延迟，避免请求过于频繁
        await this._delay(100);
      }

      this.isUploading = false;

      // 保存上传记录到本地
      await this._saveUploadRecord();

      // 发送完成事件
      globalEvent.emit('upload:complete', {
        total: this.progress.total,
        uploaded: this.uploadedFiles.length,
        failed: this.failedFiles.length
      });

      if (onComplete) {
        onComplete(this.uploadedFiles, this.failedFiles);
      }

      return {
        success: true,
        total: this.progress.total,
        uploaded: this.uploadedFiles.length,
        failed: this.failedFiles.length,
        uploadedFiles: this.uploadedFiles,
        failedFiles: this.failedFiles
      };

    } catch (error) {
      this.isUploading = false;
      console.error('[UploadTool] 上传过程出错:', error);
      
      if (onComplete) {
        onComplete(this.uploadedFiles, this.failedFiles, error);
      }
      
      return {
        success: false,
        error: error.message,
        uploaded: this.uploadedFiles.length,
        failed: this.failedFiles.length
      };
    }
  }

  /**
   * 上传单个文件
   */
  async _uploadSingleFile(item) {
    console.log(`[UploadTool] 上传: ${item.localPath} -> ${item.cloudPath}`);

    const result = await this.cloudStorage.uploadFile(
      item.localPath,
      item.cloudPath
    );

    return result;
  }

  /**
   * 保存上传记录到本地存储
   */
  async _saveUploadRecord() {
    if (typeof wx === 'undefined') return;
    
    try {
      const record = {
        timestamp: Date.now(),
        files: this.uploadedFiles.map(f => ({
          localPath: f.localPath,
          fileID: f.fileID
        }))
      };
      wx.setStorageSync('cloud_upload_record', record);
      console.log('[UploadTool] 上传记录已保存');
    } catch (e) {
      console.warn('[UploadTool] 保存上传记录失败:', e);
    }
  }

  /**
   * 获取上次上传记录
   */
  getUploadRecord() {
    if (typeof wx === 'undefined') return null;
    
    try {
      return wx.getStorageSync('cloud_upload_record') || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 获取所有已上传文件的 fileID 映射
   */
  getUploadedFileMap() {
    const record = this.getUploadRecord();
    if (!record || !record.files) return {};
    
    const map = {};
    for (const file of record.files) {
      map[file.localPath] = file.fileID;
    }
    return map;
  }

  /**
   * 检查文件是否已上传
   */
  isFileUploaded(localPath) {
    const map = this.getUploadedFileMap();
    return !!map[localPath];
  }

  /**
   * 获取上传状态
   */
  getStatus() {
    return {
      isUploading: this.isUploading,
      progress: this.progress,
      uploadedCount: this.uploadedFiles.length,
      failedCount: this.failedFiles.length
    };
  }

  /**
   * 取消上传
   */
  cancel() {
    this.isUploading = false;
    this.uploadQueue = [];
    console.log('[UploadTool] 上传已取消');
  }

  /**
   * 延迟辅助
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default UploadTool;
