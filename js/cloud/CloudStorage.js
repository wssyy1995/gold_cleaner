/**
 * CloudStorage 微信云存储管理
 * 负责任务 4.1.1 ~ 4.1.4
 * - 4.1.1 在微信云开发后台创建云存储
 * - 4.1.2 配置云存储的权限规则
 * - 4.1.3 在小游戏中初始化CloudBase SDK
 * - 4.1.4 设计云存储文件目录结构与命名规范
 */

import { globalEvent } from '../core/EventEmitter';

class CloudStorage {
  constructor() {
    // 云环境配置
    this.cloudEnv = 'cloudbase-0gku48938517adc7';
    
    // CloudBase SDK 实例
    this.cloud = null;
    
    // 4.1.4 设计云存储文件目录结构与命名规范
    // 云存储目录结构
    this.directories = {
      IMAGES: 'images/',           // 图片资源
      IMAGES_UI: 'images/ui/',     // UI图片
      IMAGES_TOOLS: 'images/tools/', // 工具图片
      IMAGES_DIRT: 'images/dirt/',   // 污垢图片
      IMAGES_SCENES: 'images/scenes/', // 场景背景
      AUDIO: 'audio/',             // 音频资源
      AUDIO_BGM: 'audio/bgm/',     // 背景音乐
      AUDIO_SFX: 'audio/sfx/',     // 音效
      CONFIG: 'config/',           // 配置文件
      DATA: 'data/'                // 数据文件
    };

    // 文件命名规范
    this.namingConvention = {
      prefix: '',           // 前缀
      version: '',          // 版本号
      hash: '',             // 文件哈希（用于缓存）
      extension: ''         // 扩展名
    };

    // 初始化状态
    this._initialized = false;
    this._initPromise = null;

    // 权限配置缓存
    this._permissionConfig = null;
  }

  /**
   * 4.1.3 在小游戏中初始化CloudBase SDK
   * 初始化云存储
   */
  async init() {
    if (this._initialized) return true;
    if (this._initPromise) return this._initPromise;

    this._initPromise = this._doInit();
    return this._initPromise;
  }

  /**
   * 执行初始化
   */
  async _doInit() {
    console.log('[CloudStorage] 初始化云存储...');

    try {
      // 检查微信环境
      if (typeof wx === 'undefined') {
        console.warn('[CloudStorage] 非微信环境，跳过云存储初始化');
        this._initialized = false;
        return false;
      }

      // 初始化 CloudBase
      if (wx.cloud) {
        wx.cloud.init({
          env: this.cloudEnv,
          traceUser: true
        });
        
        this.cloud = wx.cloud;
        console.log('[CloudStorage] CloudBase 初始化成功');
      } else {
        console.warn('[CloudStorage] wx.cloud 不可用');
        return false;
      }

      // 4.1.2 配置云存储的权限规则
      // 加载权限配置
      await this._loadPermissionConfig();

      this._initialized = true;
      
      globalEvent.emit('cloud:initialized', { success: true });
      
      return true;
    } catch (error) {
      console.error('[CloudStorage] 初始化失败:', error);
      globalEvent.emit('cloud:initialized', { success: false, error });
      return false;
    }
  }

  /**
   * 4.1.2 配置云存储的权限规则
   * 加载权限配置
   */
  async _loadPermissionConfig() {
    // 默认权限配置
    this._permissionConfig = {
      // 读取权限：所有用户可读
      read: true,
      // 写入权限：仅管理员可写
      write: false,
      // 自定义安全规则
      rules: {
        // 公开资源，所有人可读
        public: {
          read: true,
          write: false
        },
        // 用户私有数据
        private: {
          read: 'auth != null',
          write: 'auth != null'
        }
      }
    };

    console.log('[CloudStorage] 权限配置已加载');
  }

  /**
   * 检查是否已初始化
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * 4.1.4 设计云存储文件目录结构与命名规范
   * 获取完整的云存储路径
   * @param {string} relativePath - 相对路径
   * @param {string} category - 资源分类
   * @returns {string}
   */
  getCloudPath(relativePath, category = '') {
    // 根据分类添加目录前缀
    let prefix = '';
    switch (category) {
      case 'ui':
        prefix = this.directories.IMAGES_UI;
        break;
      case 'tool':
        prefix = this.directories.IMAGES_TOOLS;
        break;
      case 'dirt':
        prefix = this.directories.IMAGES_DIRT;
        break;
      case 'scene':
        prefix = this.directories.IMAGES_SCENES;
        break;
      case 'bgm':
        prefix = this.directories.AUDIO_BGM;
        break;
      case 'sfx':
        prefix = this.directories.AUDIO_SFX;
        break;
      case 'config':
        prefix = this.directories.CONFIG;
        break;
      default:
        prefix = '';
    }

    // 规范化路径
    const normalizedPath = relativePath.startsWith('/') 
      ? relativePath.slice(1) 
      : relativePath;

    return prefix + normalizedPath;
  }

  /**
   * 生成带版本号的文件名
   * @param {string} fileName - 原始文件名
   * @param {string} version - 版本号
   * @returns {string}
   */
  generateVersionedFileName(fileName, version = '') {
    if (!version) return fileName;

    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return `${fileName}_v${version}`;
    }

    const name = fileName.slice(0, lastDotIndex);
    const ext = fileName.slice(lastDotIndex);
    return `${name}_v${version}${ext}`;
  }

  /**
   * 上传文件到云存储
   * @param {string} localPath - 本地文件路径
   * @param {string} cloudPath - 云存储路径
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async uploadFile(localPath, cloudPath, options = {}) {
    if (!this._initialized) {
      await this.init();
    }

    if (!this.cloud) {
      return { success: false, error: 'cloud_not_initialized' };
    }

    try {
      console.log(`[CloudStorage] 上传文件: ${localPath} -> ${cloudPath}`);

      const result = await this.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: localPath,
        config: {
          env: this.cloudEnv
        }
      });

      console.log('[CloudStorage] 上传成功:', result.fileID);

      globalEvent.emit('cloud:uploadSuccess', {
        localPath,
        cloudPath,
        fileID: result.fileID
      });

      return {
        success: true,
        fileID: result.fileID,
        statusCode: result.statusCode
      };
    } catch (error) {
      console.error('[CloudStorage] 上传失败:', error);

      globalEvent.emit('cloud:uploadError', {
        localPath,
        cloudPath,
        error
      });

      return {
        success: false,
        error: error.message || 'upload_failed'
      };
    }
  }

  /**
   * 下载文件
   * @param {string} fileID - 云文件ID
   * @param {string} localPath - 本地保存路径
   * @returns {Promise<Object>}
   */
  async downloadFile(fileID, localPath = '') {
    if (!this._initialized) {
      await this.init();
    }

    if (!this.cloud) {
      return { success: false, error: 'cloud_not_initialized' };
    }

    try {
      const result = await this.cloud.downloadFile({
        fileID: fileID
      });

      return {
        success: true,
        tempFilePath: result.tempFilePath,
        statusCode: result.statusCode
      };
    } catch (error) {
      console.error('[CloudStorage] 下载失败:', error);
      return {
        success: false,
        error: error.message || 'download_failed'
      };
    }
  }

  /**
   * 获取临时访问链接
   * @param {string} fileID - 云文件ID
   * @param {number} expires - 过期时间（秒）
   * @returns {Promise<string|null>}
   */
  async getTempFileURL(fileID, expires = 7200) {
    if (!this._initialized) {
      await this.init();
    }

    if (!this.cloud) return null;

    try {
      const result = await this.cloud.getTempFileURL({
        fileList: [{
          fileID: fileID,
          maxAge: expires
        }]
      });

      if (result.fileList && result.fileList.length > 0) {
        const file = result.fileList[0];
        if (file.status === 0) {
          return file.tempFileURL;
        }
      }
      return null;
    } catch (error) {
      console.error('[CloudStorage] 获取临时链接失败:', error);
      return null;
    }
  }

  /**
   * 删除云存储文件
   * @param {string} fileID - 云文件ID
   * @returns {Promise<boolean>}
   */
  async deleteFile(fileID) {
    if (!this._initialized) {
      await this.init();
    }

    if (!this.cloud) return false;

    try {
      await this.cloud.deleteFile({
        fileList: [fileID]
      });

      console.log('[CloudStorage] 删除文件:', fileID);
      return true;
    } catch (error) {
      console.error('[CloudStorage] 删除文件失败:', error);
      return false;
    }
  }

  /**
   * 获取文件列表
   * @param {string} prefix - 路径前缀
   * @param {number} maxKeys - 最大数量
   * @returns {Promise<Array>}
   */
  async listFiles(prefix = '', maxKeys = 100) {
    if (!this._initialized) {
      await this.init();
    }

    if (!this.cloud) return [];

    try {
      // 使用云函数获取文件列表
      const result = await this.cloud.callFunction({
        name: 'listFiles',
        data: {
          prefix,
          maxKeys
        }
      });

      return result.result?.files || [];
    } catch (error) {
      console.error('[CloudStorage] 获取文件列表失败:', error);
      return [];
    }
  }

  /**
   * 4.1.4 设计云存储文件目录结构与命名规范
   * 获取目录结构
   * @returns {Object}
   */
  getDirectoryStructure() {
    return {
      root: 'cloud://',
      directories: this.directories,
      conventions: {
        // 图片资源命名规范
        images: {
          pattern: '{category}_{name}_{version}.{ext}',
          example: 'ui_btn_close_v1.0.0.png'
        },
        // 音频资源命名规范
        audio: {
          pattern: '{type}_{name}.{ext}',
          example: 'bgm_main.mp3'
        },
        // 配置文件命名规范
        config: {
          pattern: '{name}_{version}.json',
          example: 'levels_v1.0.0.json'
        }
      }
    };
  }

  /**
   * 验证文件路径是否符合命名规范
   * @param {string} path - 文件路径
   * @returns {Object}
   */
  validateFilePath(path) {
    const errors = [];
    const warnings = [];

    // 检查路径深度
    const depth = path.split('/').length;
    if (depth > 5) {
      warnings.push('路径深度超过5层，建议简化目录结构');
    }

    // 检查文件名
    const fileName = path.split('/').pop();
    if (fileName.includes(' ')) {
      errors.push('文件名不能包含空格');
    }
    if (/[^a-zA-Z0-9._-]/.test(fileName)) {
      warnings.push('文件名建议只包含字母、数字、下划线、点和连字符');
    }

    // 检查扩展名
    const ext = fileName.split('.').pop().toLowerCase();
    const validExts = ['png', 'jpg', 'jpeg', 'gif', 'mp3', 'wav', 'json', 'xml'];
    if (!validExts.includes(ext)) {
      warnings.push(`不常见的文件扩展名: ${ext}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 获取云存储统计信息
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    if (!this._initialized) {
      await this.init();
    }

    try {
      const result = await this.cloud.callFunction({
        name: 'getStorageStats'
      });

      return result.result || {};
    } catch (error) {
      console.error('[CloudStorage] 获取统计信息失败:', error);
      return {};
    }
  }

  /**
   * 销毁
   */
  destroy() {
    this._initialized = false;
    this._initPromise = null;
    this.cloud = null;
  }
}

export default CloudStorage;
