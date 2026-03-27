/**
 * ResourceManager 资源管理器（运维侧）
 * 负责任务 4.3.1 ~ 4.3.4
 * - 4.3.1 整理所有游戏美术资源
 * - 4.3.2 上传资源到微信云存储
 * - 4.3.3 生成资源清单配置文件
 * - 4.3.4 测试CDN分发速度
 */

import { globalEvent } from '../core/EventEmitter';
import CloudStorage from './CloudStorage';

class ResourceManager {
  constructor() {
    // 云存储实例
    this._cloudStorage = new CloudStorage();

    // 4.3.1 整理所有游戏美术资源
    // 资源分类定义
    this.resourceCategories = {
      ui: {
        name: 'UI资源',
        path: 'images/ui/',
        extensions: ['.png', '.jpg'],
        description: '按钮、面板、图标等UI元素'
      },
      tools: {
        name: '工具资源',
        path: 'images/tools/',
        extensions: ['.png'],
        description: '清洁工具图标'
      },
      dirt: {
        name: '污垢资源',
        path: 'images/dirt/',
        extensions: ['.png'],
        description: '各种污垢图片'
      },
      scenes: {
        name: '场景资源',
        path: 'images/scenes/',
        extensions: ['.png', '.jpg'],
        description: '房间背景、地图等'
      },
      effects: {
        name: '特效资源',
        path: 'images/effects/',
        extensions: ['.png'],
        description: '闪光、粒子等特效'
      },
      audioBgm: {
        name: '背景音乐',
        path: 'audio/bgm/',
        extensions: ['.mp3'],
        description: '背景音乐'
      },
      audioSfx: {
        name: '音效',
        path: 'audio/sfx/',
        extensions: ['.mp3', '.wav'],
        description: '游戏音效'
      },
      config: {
        name: '配置文件',
        path: 'config/',
        extensions: ['.json'],
        description: '关卡配置、游戏配置等'
      }
    };

    // 资源清单
    this._resourceManifest = {
      version: '1.0.0',
      lastUpdated: null,
      resources: new Map()
    };

    // 上传队列
    this._uploadQueue = [];
    
    // 资源统计
    this._stats = {
      total: 0,
      uploaded: 0,
      failed: 0,
      skipped: 0,
      totalSize: 0
    };
  }

  /**
   * 初始化资源管理器
   */
  async init() {
    console.log('[ResourceManager] 初始化资源管理器');
    await this._cloudStorage.init();
  }

  /**
   * 4.3.1 整理所有游戏美术资源
   * 扫描并整理本地资源
   * @param {string} localBasePath - 本地资源根目录
   * @returns {Promise<Object>}
   */
  async organizeResources(localBasePath = 'assets/') {
    console.log('[ResourceManager] 开始整理资源...');

    const organized = {
      categories: {},
      totalCount: 0,
      totalSize: 0,
      issues: []
    };

    // 扫描每个分类
    for (const [categoryKey, category] of Object.entries(this.resourceCategories)) {
      const result = await this._scanCategory(localBasePath, categoryKey, category);
      organized.categories[categoryKey] = result;
      organized.totalCount += result.count;
      organized.totalSize += result.size;
      organized.issues.push(...result.issues);
    }

    // 检查命名规范
    const namingIssues = this._checkNamingConventions(organized.categories);
    organized.issues.push(...namingIssues);

    console.log(`[ResourceManager] 资源整理完成: ${organized.totalCount} 个文件`);
    
    return organized;
  }

  /**
   * 扫描分类目录
   */
  async _scanCategory(basePath, categoryKey, category) {
    const result = {
      category: categoryKey,
      name: category.name,
      count: 0,
      size: 0,
      files: [],
      issues: []
    };

    if (typeof wx === 'undefined') {
      // 开发环境模拟数据
      return result;
    }

    try {
      const fs = wx.getFileSystemManager();
      const dirPath = `${basePath}${category.path}`;

      // 读取目录
      const files = fs.readdirSync(dirPath);

      for (const fileName of files) {
        const filePath = `${dirPath}${fileName}`;
        
        try {
          const stat = fs.statSync(filePath);
          
          if (stat.isFile()) {
            // 检查扩展名
            const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
            if (!category.extensions.includes(ext)) {
              result.issues.push({
                type: 'warning',
                file: filePath,
                message: `不推荐的文件扩展名: ${ext}`
              });
            }

            result.files.push({
              name: fileName,
              path: filePath,
              size: stat.size,
              modified: stat.lastModifiedTime,
              ext: ext
            });

            result.count++;
            result.size += stat.size;
          }
        } catch (e) {
          result.issues.push({
            type: 'error',
            file: filePath,
            message: e.message
          });
        }
      }
    } catch (e) {
      result.issues.push({
        type: 'error',
        category: categoryKey,
        message: `无法读取目录: ${e.message}`
      });
    }

    return result;
  }

  /**
   * 检查命名规范
   */
  _checkNamingConventions(categories) {
    const issues = [];
    const namingRules = {
      ui: /^ui_[a-z]+_[a-z0-9_]+\.png$/,
      tools: /^tool_[a-z]+_[a-z0-9_]+\.png$/,
      dirt: /^dirt_[a-z]+_[a-z0-9_]+(_\d+)?\.png$/,
      scenes: /^(scene|bg)_[a-z]+_[a-z0-9_]+\.png$/,
      audioBgm: /^bgm_[a-z]+\.(mp3|wav)$/,
      audioSfx: /^sfx_[a-z]+_[a-z0-9_]+\.(mp3|wav)$/
    };

    for (const [categoryKey, category] of Object.entries(categories)) {
      const rule = namingRules[categoryKey];
      if (!rule) continue;

      for (const file of category.files) {
        if (!rule.test(file.name)) {
          issues.push({
            type: 'warning',
            file: file.path,
            message: `文件名不符合 ${categoryKey} 命名规范`,
            suggestion: this._getNamingSuggestion(categoryKey)
          });
        }
      }
    }

    return issues;
  }

  /**
   * 获取命名建议
   */
  _getNamingSuggestion(category) {
    const suggestions = {
      ui: 'ui_{类型}_{名称}.png (如: ui_btn_close.png)',
      tools: 'tool_{类别}_{名称}.png (如: tool_basic_cloth.png)',
      dirt: 'dirt_{类型}_{名称}_{阶段}.png (如: dirt_dust_floor_1.png)',
      scenes: 'scene_{类型}_{名称}.png (如: scene_room_kitchen.png)'
    };
    return suggestions[category] || '请参考命名规范文档';
  }

  /**
   * 4.3.2 上传资源到微信云存储
   * 上传资源
   * @param {Array} files - 文件列表
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Object>}
   */
  async uploadResources(files, onProgress = null) {
    console.log('[ResourceManager] 开始上传资源...');

    this._resetStats();
    this._stats.total = files.length;

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    // 分批上传
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(file => this._uploadSingleFile(file))
      );

      for (const result of batchResults) {
        if (result.success) {
          results.success.push(result);
          this._stats.uploaded++;
        } else if (result.skipped) {
          results.skipped.push(result);
          this._stats.skipped++;
        } else {
          results.failed.push(result);
          this._stats.failed++;
        }
      }

      // 更新进度
      if (onProgress) {
        onProgress({
          current: Math.min(i + batchSize, files.length),
          total: files.length,
          uploaded: this._stats.uploaded,
          failed: this._stats.failed,
          skipped: this._stats.skipped
        });
      }
    }

    console.log(`[ResourceManager] 上传完成: 成功 ${results.success.length}, 失败 ${results.failed.length}`);

    return results;
  }

  /**
   * 上传单个文件
   */
  async _uploadSingleFile(file) {
    // 检查是否需要上传（比较修改时间或哈希）
    const shouldUpload = await this._shouldUpload(file);
    if (!shouldUpload) {
      return {
        success: false,
        skipped: true,
        file: file.name,
        message: '文件未更改，跳过上传'
      };
    }

    // 构建云端路径
    const cloudPath = this._getCloudPath(file);

    // 执行上传
    const result = await this._cloudStorage.uploadFile(
      file.path,
      cloudPath
    );

    if (result.success) {
      // 更新资源清单
      this._resourceManifest.resources.set(file.name, {
        localPath: file.path,
        cloudPath: cloudPath,
        fileID: result.fileID,
        size: file.size,
        modified: file.modified,
        uploadedAt: Date.now()
      });

      return {
        success: true,
        file: file.name,
        fileID: result.fileID,
        cloudPath: cloudPath
      };
    } else {
      return {
        success: false,
        file: file.name,
        error: result.error
      };
    }
  }

  /**
   * 检查是否需要上传
   */
  async _shouldUpload(file) {
    const existing = this._resourceManifest.resources.get(file.name);
    if (!existing) return true;

    // 比较修改时间
    if (file.modified > existing.modified) {
      return true;
    }

    // 比较大小
    if (file.size !== existing.size) {
      return true;
    }

    return false;
  }

  /**
   * 获取云端路径
   */
  _getCloudPath(file) {
    // 根据文件路径推断分类
    for (const [key, category] of Object.entries(this.resourceCategories)) {
      if (file.path.includes(category.path)) {
        return `${category.path}${file.name}`;
      }
    }
    return `misc/${file.name}`;
  }

  /**
   * 4.3.3 生成资源清单配置文件
   * 生成资源清单
   * @returns {Object}
   */
  generateManifest() {
    this._resourceManifest.version = this._generateVersion();
    this._resourceManifest.lastUpdated = new Date().toISOString();

    const manifest = {
      version: this._resourceManifest.version,
      lastUpdated: this._resourceManifest.lastUpdated,
      resources: {}
    };

    // 按分类组织
    for (const [name, info] of this._resourceManifest.resources) {
      const category = this._getResourceCategory(info.cloudPath);
      
      if (!manifest.resources[category]) {
        manifest.resources[category] = [];
      }

      manifest.resources[category].push({
        name: name,
        fileID: info.fileID,
        cloudPath: info.cloudPath,
        size: info.size
      });
    }

    // 排序
    for (const category in manifest.resources) {
      manifest.resources[category].sort((a, b) => a.name.localeCompare(b.name));
    }

    console.log('[ResourceManager] 资源清单已生成');

    return manifest;
  }

  /**
   * 4.3.3 生成资源清单配置文件
   * 保存资源清单到文件
   * @param {Object} manifest - 资源清单
   * @param {string} outputPath - 输出路径
   * @returns {Promise<boolean>}
   */
  async saveManifest(manifest, outputPath = 'config/resource_manifest.json') {
    try {
      const content = JSON.stringify(manifest, null, 2);

      if (typeof wx !== 'undefined') {
        const fs = wx.getFileSystemManager();
        
        // 写入本地临时文件
        const tempPath = `${wx.env.USER_DATA_PATH}/resource_manifest.json`;
        fs.writeFileSync(tempPath, content, 'utf8');

        // 上传到云存储
        const result = await this._cloudStorage.uploadFile(tempPath, outputPath);
        
        if (result.success) {
          console.log('[ResourceManager] 资源清单已保存:', outputPath);
          return true;
        }
      }

      return false;
    } catch (e) {
      console.error('[ResourceManager] 保存资源清单失败:', e);
      return false;
    }
  }

  /**
   * 获取资源分类
   */
  _getResourceCategory(cloudPath) {
    for (const [key, category] of Object.entries(this.resourceCategories)) {
      if (cloudPath.startsWith(category.path)) {
        return key;
      }
    }
    return 'misc';
  }

  /**
   * 生成版本号
   */
  _generateVersion() {
    const now = new Date();
    return `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}_${now.getHours()}${now.getMinutes()}`;
  }

  /**
   * 4.3.4 测试CDN分发速度
   * 测试资源加载速度
   * @param {Array} resources - 资源列表
   * @returns {Promise<Object>}
   */
  async testCDNSpeed(resources) {
    console.log('[ResourceManager] 开始测试CDN速度...');

    const results = {
      total: resources.length,
      tested: 0,
      averageSpeed: 0,
      details: []
    };

    let totalSpeed = 0;

    for (const resource of resources) {
      const testResult = await this._testSingleResource(resource);
      
      results.details.push(testResult);
      results.tested++;

      if (testResult.success && testResult.speed > 0) {
        totalSpeed += testResult.speed;
      }
    }

    // 计算平均速度
    const successfulTests = results.details.filter(r => r.success).length;
    if (successfulTests > 0) {
      results.averageSpeed = totalSpeed / successfulTests;
    }

    console.log(`[ResourceManager] CDN速度测试完成: 平均 ${results.averageSpeed.toFixed(2)} KB/s`);

    return results;
  }

  /**
   * 测试单个资源
   */
  async _testSingleResource(resource) {
    const startTime = Date.now();
    
    try {
      // 获取临时链接
      const tempUrl = await this._cloudStorage.getTempFileURL(resource.fileID, 60);
      
      if (!tempUrl) {
        return {
          name: resource.name,
          success: false,
          error: '无法获取临时链接'
        };
      }

      // 下载测试
      const downloadStart = Date.now();
      const result = await this._downloadForTest(tempUrl);
      const downloadTime = Date.now() - downloadStart;

      // 计算速度 (KB/s)
      const speed = result.size / (downloadTime / 1000) / 1024;

      return {
        name: resource.name,
        success: true,
        size: result.size,
        time: downloadTime,
        speed: speed,
        totalTime: Date.now() - startTime
      };
    } catch (e) {
      return {
        name: resource.name,
        success: false,
        error: e.message
      };
    }
  }

  /**
   * 下载用于测试
   */
  _downloadForTest(url) {
    return new Promise((resolve, reject) => {
      if (typeof wx !== 'undefined') {
        wx.request({
          url: url,
          method: 'GET',
          responseType: 'arraybuffer',
          success: (res) => {
            if (res.statusCode === 200) {
              resolve({
                size: res.data.byteLength
              });
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          },
          fail: reject
        });
      } else {
        // 浏览器环境
        fetch(url)
          .then(r => r.arrayBuffer())
          .then(data => resolve({ size: data.byteLength }))
          .catch(reject);
      }
    });
  }

  /**
   * 生成资源优化建议
   * @param {Object} organized - 整理后的资源信息
   * @returns {Array}
   */
  generateOptimizationSuggestions(organized) {
    const suggestions = [];

    // 检查文件大小
    for (const [categoryKey, category] of Object.entries(organized.categories)) {
      const largeFiles = category.files.filter(f => f.size > 500 * 1024); // >500KB
      if (largeFiles.length > 0) {
        suggestions.push({
          type: 'warning',
          category: categoryKey,
          message: `${category.name} 中有 ${largeFiles.length} 个文件超过500KB，建议压缩`,
          files: largeFiles.map(f => f.name)
        });
      }
    }

    // 检查总大小
    if (organized.totalSize > 50 * 1024 * 1024) {
      suggestions.push({
        type: 'warning',
        message: `资源总大小 ${(organized.totalSize / 1024 / 1024).toFixed(2)}MB 超过50MB，建议优化或分包加载`
      });
    }

    // 检查缺失的分类
    for (const [key, category] of Object.entries(this.resourceCategories)) {
      if (!organized.categories[key] || organized.categories[key].count === 0) {
        suggestions.push({
          type: 'info',
          category: key,
          message: `${category.name} 为空，请确认是否需要添加`
        });
      }
    }

    return suggestions;
  }

  /**
   * 重置统计
   */
  _resetStats() {
    this._stats = {
      total: 0,
      uploaded: 0,
      failed: 0,
      skipped: 0,
      totalSize: 0
    };
  }

  /**
   * 获取资源清单
   * @returns {Object}
   */
  getManifest() {
    return this._resourceManifest;
  }

  /**
   * 加载资源清单
   * @param {Object} manifest - 资源清单
   */
  loadManifest(manifest) {
    this._resourceManifest.version = manifest.version || '1.0.0';
    this._resourceManifest.lastUpdated = manifest.lastUpdated;
    
    if (manifest.resources) {
      this._resourceManifest.resources = new Map(Object.entries(manifest.resources));
    }
  }

  /**
   * 销毁
   */
  destroy() {
    this._cloudStorage.destroy();
    this._resourceManifest.resources.clear();
    this._uploadQueue = [];
  }
}

export default ResourceManager;
