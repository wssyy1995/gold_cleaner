/**
 * LevelConfig 关卡配置
 * 4个阶段，每个阶段10个关卡（共40关）
 */

// 污垢类型定义
export const DIRT_TYPES = {
  dust: { 
    name: '灰尘', 
    color: '#8B4513', 
    difficulty: 1,
    recipes: [['cloth'], ['sponge'], ['vacuum']]
  },
  stain: { 
    name: '污渍', 
    color: '#654321', 
    difficulty: 2,
    recipes: [['spray', 'cloth'], ['sponge', 'sponge']]
  },
  grime: { 
    name: '油垢', 
    color: '#3E2723', 
    difficulty: 3,
    recipes: [['spray', 'brush'], ['sponge', 'sponge', 'sponge']]
  },
  mold: {
    name: '霉斑',
    color: '#2E7D32',
    difficulty: 4,
    recipes: [['spray', 'spray', 'brush'], ['magic_sponge']]
  },
  rust: {
    name: '锈迹',
    color: '#C62828',
    difficulty: 5,
    recipes: [['rust_remover', 'brush'], ['spray', 'spray', 'sponge']]
  }
};

// 阶段1：新手村 - 温馨小屋（简单，主要是灰尘和少量污渍）
const STAGE_1_LEVELS = [
  {
    id: 1,
    stage: 1,
    name: '老年人卧室',
    background: 'images/game/stage1_level1.png',
    preview: 'images/game/stage1_l1_home.png',
    dirts: [
      { type: 'dust', x: 300, y: 400 },
      { type: 'dust', x: 500, y: 600 },
    ],
    timeLimit: 120,
    targetScore: 100,
    reward: { coins: 50, stars: 3 },
    tutorial: true // 显示教程
  },
  {
    id: 2,
    stage: 1,
    name: '客厅清洁',
    background: 'images/game/stage1_level2.png',
    preview: 'images/game/stage1_l2_home.png',
    dirts: [
      { type: 'dust', x: 200, y: 350 },
      { type: 'dust', x: 400, y: 500 },
      { type: 'dust', x: 600, y: 400 },
    ],
    timeLimit: 100,
    targetScore: 150,
    reward: { coins: 60, stars: 3 }
  },
  {
    id: 3,
    stage: 1,
    name: '厨房初体验',
    background: 'images/game/stage1_level3.png',
    preview: 'images/game/stage1_l3_home.png',
    dirts: [
      { type: 'dust', x: 250, y: 300 },
      { type: 'stain', x: 450, y: 450 },
      { type: 'dust', x: 550, y: 350 },
    ],
    timeLimit: 100,
    targetScore: 200,
    reward: { coins: 70, stars: 3 }
  },
  {
    id: 4,
    stage: 1,
    name: '卧室整理',
    background: 'images/game/stage1_level4.png',
    dirts: [
      { type: 'dust', x: 200, y: 400 },
      { type: 'dust', x: 350, y: 550 },
      { type: 'stain', x: 500, y: 350 },
      { type: 'dust', x: 650, y: 500 },
    ],
    timeLimit: 90,
    targetScore: 250,
    reward: { coins: 80, stars: 3 }
  },
  {
    id: 5,
    stage: 1,
    name: '浴室挑战',
    background: 'images/game/stage1_level5.png',
    dirts: [
      { type: 'stain', x: 300, y: 400 },
      { type: 'stain', x: 500, y: 500 },
      { type: 'dust', x: 200, y: 300 },
      { type: 'dust', x: 600, y: 450 },
    ],
    timeLimit: 90,
    targetScore: 300,
    reward: { coins: 90, stars: 3 }
  },
  {
    id: 6,
    stage: 1,
    name: '阳台打扫',
    background: 'images/game/stage1_level6.png',
    dirts: [
      { type: 'dust', x: 200, y: 350 },
      { type: 'stain', x: 400, y: 500 },
      { type: 'dust', x: 600, y: 400 },
      { type: 'stain', x: 300, y: 600 },
    ],
    timeLimit: 80,
    targetScore: 350,
    reward: { coins: 100, stars: 3 }
  },
  {
    id: 7,
    stage: 1,
    name: '全屋大扫除',
    background: 'images/game/stage1_level7.png',
    dirts: [
      { type: 'dust', x: 150, y: 300 },
      { type: 'stain', x: 350, y: 450 },
      { type: 'dust', x: 550, y: 350 },
      { type: 'stain', x: 250, y: 600 },
      { type: 'dust', x: 650, y: 550 },
    ],
    timeLimit: 120,
    targetScore: 400,
    reward: { coins: 110, stars: 3 }
  },
  {
    id: 8,
    stage: 1,
    name: '油污处理',
    background: 'images/game/stage1_level8.png',
    dirts: [
      { type: 'grime', x: 300, y: 400 },
      { type: 'dust', x: 200, y: 300 },
      { type: 'stain', x: 500, y: 500 },
      { type: 'grime', x: 600, y: 450 },
    ],
    timeLimit: 100,
    targetScore: 450,
    reward: { coins: 120, stars: 3 }
  },
  {
    id: 9,
    stage: 1,
    name: '困难清洁',
    background: 'images/game/stage1_level9.png',
    dirts: [
      { type: 'grime', x: 250, y: 350 },
      { type: 'grime', x: 450, y: 500 },
      { type: 'stain', x: 350, y: 600 },
      { type: 'dust', x: 600, y: 400 },
    ],
    timeLimit: 100,
    targetScore: 500,
    reward: { coins: 130, stars: 3 }
  },
  {
    id: 10,
    stage: 1,
    name: '阶段BOSS',
    background: 'images/game/stage1_level10.png',
    dirts: [
      { type: 'grime', x: 250, y: 350, size: 1.5 },
      { type: 'grime', x: 550, y: 450, size: 1.5 },
      { type: 'grime', x: 400, y: 600, size: 2 },
      { type: 'stain', x: 200, y: 550 },
      { type: 'stain', x: 600, y: 350 },
      { type: 'dust', x: 400, y: 250 },
    ],
    timeLimit: 120,
    targetScore: 800,
    reward: { coins: 300, stars: 3, unlockStage: 2 }
  }
];

// 阶段2：公寓大楼 - 进阶挑战（增加霉斑）
const STAGE_2_LEVELS = [
  {
    id: 1,
    stage: 2,
    name: '新阶段开始',
    background: 'images/game/stage2_level1.png',
    preview: 'images/game/stage2_l1_home.png',
    dirts: [
      { type: 'dust', x: 300, y: 400 },
      { type: 'stain', x: 500, y: 500 },
      { type: 'mold', x: 400, y: 300 },
    ],
    timeLimit: 100,
    targetScore: 400,
    reward: { coins: 100, stars: 3 }
  },
  // ... 阶段2的第2-9关（类似结构）
  {
    id: 10,
    stage: 2,
    name: '公寓管理员',
    background: 'images/game/stage2_level10.png',
    preview: 'images/game/stage2_l10_home.png',
    dirts: [
      { type: 'mold', x: 300, y: 400, size: 2 },
      { type: 'mold', x: 500, y: 500, size: 2 },
      { type: 'grime', x: 200, y: 600 },
      { type: 'grime', x: 600, y: 350 },
      { type: 'stain', x: 400, y: 700 },
    ],
    timeLimit: 120,
    targetScore: 1200,
    reward: { coins: 500, stars: 3, unlockStage: 3 }
  }
];

// 阶段3：别墅庄园 - 专家难度（增加锈迹）
const STAGE_3_LEVELS = [
  {
    id: 1,
    stage: 3,
    name: '别墅大厅',
    background: 'images/game/stage3_level1.png',
    preview: 'images/game/stage3_l1_home.png',
    dirts: [
      { type: 'rust', x: 300, y: 400 },
      { type: 'mold', x: 500, y: 500 },
      { type: 'grime', x: 400, y: 600 },
    ],
    timeLimit: 90,
    targetScore: 600,
    reward: { coins: 150, stars: 3 }
  },
  // ... 阶段3的第2-9关
  {
    id: 10,
    stage: 3,
    name: '庄园主人',
    background: 'images/game/stage3_level10.png',
    preview: 'images/game/stage3_l10_home.png',
    dirts: [
      { type: 'rust', x: 250, y: 350, size: 2 },
      { type: 'rust', x: 550, y: 450, size: 2 },
      { type: 'mold', x: 400, y: 600, size: 1.5 },
      { type: 'grime', x: 200, y: 500 },
      { type: 'grime', x: 600, y: 550 },
    ],
    timeLimit: 120,
    targetScore: 2000,
    reward: { coins: 800, stars: 3, unlockStage: 4 }
  }
];

// 阶段4：豪华酒店 - 大师难度（全部污垢类型）
const STAGE_4_LEVELS = [
  {
    id: 1,
    stage: 4,
    name: '总统套房',
    background: 'images/game/stage4_level1.png',
    preview: 'images/game/stage4_l1_home.png',
    dirts: [
      { type: 'rust', x: 200, y: 400 },
      { type: 'mold', x: 400, y: 300 },
      { type: 'grime', x: 600, y: 500 },
      { type: 'stain', x: 300, y: 600 },
    ],
    timeLimit: 80,
    targetScore: 800,
    reward: { coins: 200, stars: 3 }
  },
  // ... 阶段4的第2-9关
  {
    id: 10,
    stage: 4,
    name: '金牌保洁大师',
    background: 'images/game/stage4_level10.png',
    preview: 'images/game/stage4_l10_home.png',
    dirts: [
      { type: 'rust', x: 150, y: 300, size: 2 },
      { type: 'rust', x: 650, y: 400, size: 2 },
      { type: 'mold', x: 300, y: 500, size: 2 },
      { type: 'mold', x: 500, y: 600, size: 2 },
      { type: 'grime', x: 250, y: 700, size: 1.5 },
      { type: 'grime', x: 550, y: 250, size: 1.5 },
      { type: 'stain', x: 400, y: 400 },
      { type: 'dust', x: 400, y: 750 },
    ],
    timeLimit: 150,
    targetScore: 5000,
    reward: { coins: 2000, stars: 3, title: '金牌保洁大师' }
  }
];

// 阶段信息
export const STAGES = [
  {
    id: 1,
    name: '温馨小屋',
    description: '新手村，学习基础清洁技巧',
    theme: 'home',
    unlockRequirement: null, // 默认解锁
    levels: STAGE_1_LEVELS
  },
  {
    id: 2,
    name: '公寓大楼',
    description: '进阶挑战，应对霉斑问题',
    theme: 'apartment',
    unlockRequirement: { stage: 1, level: 10 }, // 通关阶段1第10关解锁
    levels: STAGE_2_LEVELS
  },
  {
    id: 3,
    name: '别墅庄园',
    description: '专家难度，处理顽固锈迹',
    theme: 'villa',
    unlockRequirement: { stage: 2, level: 10 }, // 通关阶段2第10关解锁
    levels: STAGE_3_LEVELS
  },
  {
    id: 4,
    name: '豪华酒店',
    description: '大师挑战，成为金牌保洁',
    theme: 'hotel',
    unlockRequirement: { stage: 3, level: 10 }, // 通关阶段3第10关解锁
    levels: STAGE_4_LEVELS
  }
];

// 工具函数：获取关卡数据
export function getLevel(stageId, levelId) {
  const stage = STAGES.find(s => s.id === stageId);
  if (!stage) return null;
  return stage.levels.find(l => l.id === levelId) || null;
}

// 工具函数：获取阶段所有关卡
export function getStageLevels(stageId) {
  const stage = STAGES.find(s => s.id === stageId);
  return stage ? stage.levels : [];
}

// 工具函数：检查阶段是否解锁
export function isStageUnlocked(stageId, completedLevels = {}) {
  const stage = STAGES.find(s => s.id === stageId);
  if (!stage) return false;
  if (!stage.unlockRequirement) return true;
  
  const req = stage.unlockRequirement;
  const key = `${req.stage}-${req.level}`;
  return completedLevels[key] === true;
}

export default {
  DIRT_TYPES,
  STAGES,
  getLevel,
  getStageLevels,
  isStageUnlocked
};
