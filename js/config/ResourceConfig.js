/**
 * 资源清单配置
 */

const ResourceConfig = {
  // 图片资源
  images: {
    // UI资源
    ui: {
      'ui_btn_normal': 'images/ui/btn_normal.png',
      'ui_btn_pressed': 'images/ui/btn_pressed.png',
      'ui_panel': 'images/ui/panel.png',
      'ui_progress_bar': 'images/ui/progress_bar.png',
      'ui_progress_bg': 'images/ui/progress_bg.png',
      'ui_coin': 'images/ui/coin.png',
      'ui_star': 'images/ui/star.png',
      'ui_back': 'images/ui/back.png',
      'ui_close': 'images/ui/close.png'
    },

    // 工具图标
    tools: {
      'tool_basic_cloth': 'images/tools/basic_cloth.png',
      'tool_sponge': 'images/tools/sponge.png',
      'tool_brush': 'images/tools/brush.png',
      'tool_spray': 'images/tools/spray.png',
      'tool_vacuum': 'images/tools/vacuum.png'
    },

    // 污垢图片
    dirt: {
      'dirt_dust': 'images/dirt/dust.png',
      'dirt_stain': 'images/dirt/stain.png',
      'dirt_grease': 'images/dirt/grease.png',
      'dirt_trash': 'images/dirt/trash.png'
    },

    // 场景背景
    scenes: {
      'bg_home': 'images/backgrounds/bg-002-home.png',
      'bg_loading': 'images/backgrounds/bg-001-loading.png',
      'bg_room_1': 'images/scenes/room_1.png',
      'bg_map': 'images/scenes/map.png'
    }
  },

  // 音频资源
  audio: {
    // 背景音乐
    bgm: {
      'bgm_main': 'audio/bgm/main.mp3',
      'bgm_game': 'audio/bgm/game.mp3'
    },

    // 音效
    sfx: {
      'sfx_click': 'audio/sfx/click.mp3',
      'sfx_clean': 'audio/sfx/clean.mp3',
      'sfx_complete': 'audio/sfx/complete.mp3',
      'sfx_error': 'audio/sfx/error.mp3',
      'sfx_coin': 'audio/sfx/coin.mp3',
      'sfx_buy': 'audio/sfx/buy.mp3'
    }
  }
};

export default ResourceConfig;
