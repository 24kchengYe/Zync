import { Menu, type MenuItemConstructorOptions, app, shell } from 'electron';

type MenuLanguage = 'en' | 'zh';

type MenuTranslations = {
  app: string;
  about: string;
  services: string;
  hide: string;
  hideOthers: string;
  showAll: string;
  quit: string;
  file: string;
  edit: string;
  view: string;
  window: string;
  help: string;
  closeWindow: string;
  undo: string;
  redo: string;
  cut: string;
  copy: string;
  paste: string;
  selectAll: string;
  reload: string;
  forceReload: string;
  toggleDevTools: string;
  actualSize: string;
  zoomIn: string;
  zoomOut: string;
  toggleFullScreen: string;
  minimize: string;
  zoom: string;
  bringAllToFront: string;
  repository: string;
};

const translations: Record<MenuLanguage, MenuTranslations> = {
  en: {
    app: 'Zync',
    about: 'About Zync',
    services: 'Services',
    hide: 'Hide Zync',
    hideOthers: 'Hide Others',
    showAll: 'Show All',
    quit: 'Quit Zync',
    file: 'File',
    edit: 'Edit',
    view: 'View',
    window: 'Window',
    help: 'Help',
    closeWindow: 'Close Window',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    reload: 'Reload',
    forceReload: 'Force Reload',
    toggleDevTools: 'Toggle Developer Tools',
    actualSize: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleFullScreen: 'Toggle Full Screen',
    minimize: 'Minimize',
    zoom: 'Zoom',
    bringAllToFront: 'Bring All to Front',
    repository: 'Project Repository',
  },
  zh: {
    app: 'Zync',
    about: '关于 Zync',
    services: '服务',
    hide: '隐藏 Zync',
    hideOthers: '隐藏其他',
    showAll: '显示全部',
    quit: '退出 Zync',
    file: '文件',
    edit: '编辑',
    view: '视图',
    window: '窗口',
    help: '帮助',
    closeWindow: '关闭窗口',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    reload: '重新加载',
    forceReload: '强制重新加载',
    toggleDevTools: '切换开发者工具',
    actualSize: '实际大小',
    zoomIn: '放大',
    zoomOut: '缩小',
    toggleFullScreen: '切换全屏',
    minimize: '最小化',
    zoom: '缩放',
    bringAllToFront: '前置全部窗口',
    repository: '项目仓库',
  },
};

function buildAppMenuTemplate(language: MenuLanguage, isDevelopment: boolean): MenuItemConstructorOptions[] {
  const t = translations[language];
  const appName = app.name || t.app;

  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      label: t.closeWindow,
      role: 'close',
    },
  ];

  if (process.platform !== 'darwin') {
    fileSubmenu.push(
      { type: 'separator' },
      {
        label: t.quit,
        role: 'quit',
      },
    );
  }

  const viewSubmenu: MenuItemConstructorOptions[] = [];

  if (isDevelopment) {
    viewSubmenu.push(
      { label: t.reload, role: 'reload' },
      { label: t.forceReload, role: 'forceReload' },
      { label: t.toggleDevTools, role: 'toggleDevTools' },
      { type: 'separator' },
    );
  }

  viewSubmenu.push(
    { label: t.actualSize, role: 'resetZoom' },
    { label: t.zoomIn, role: 'zoomIn' },
    { label: t.zoomOut, role: 'zoomOut' },
    { type: 'separator' },
    { label: t.toggleFullScreen, role: 'togglefullscreen' },
  );

  const template: MenuItemConstructorOptions[] = [];

  if (process.platform === 'darwin') {
    template.push({
      label: appName,
      submenu: [
        { label: t.about, role: 'about' },
        { type: 'separator' },
        { label: t.services, role: 'services', submenu: [] },
        { type: 'separator' },
        { label: t.hide, role: 'hide' },
        { label: t.hideOthers, role: 'hideOthers' },
        { label: t.showAll, role: 'unhide' },
        { type: 'separator' },
        { label: t.quit, role: 'quit' },
      ],
    });
  }

  template.push(
    {
      label: t.file,
      submenu: fileSubmenu,
    },
    {
      label: t.edit,
      submenu: [
        { label: t.undo, role: 'undo' },
        { label: t.redo, role: 'redo' },
        { type: 'separator' },
        { label: t.cut, role: 'cut' },
        { label: t.copy, role: 'copy' },
        { label: t.paste, role: 'paste' },
        { type: 'separator' },
        { label: t.selectAll, role: 'selectAll' },
      ],
    },
    {
      label: t.view,
      submenu: viewSubmenu,
    },
    {
      label: t.window,
      submenu: [
        { label: t.minimize, role: 'minimize' },
        { label: t.zoom, role: 'zoom' },
        { label: t.closeWindow, role: 'close' },
        ...(process.platform === 'darwin'
          ? [{ type: 'separator' as const }, { label: t.bringAllToFront, role: 'front' as const }]
          : []),
      ],
    },
    {
      label: t.help,
      submenu: [
        {
          label: t.repository,
          click: async () => {
            await shell.openExternal('https://github.com/24kchengYe/Zync');
          },
        },
      ],
    },
  );

  return template;
}

export function setApplicationMenuForLanguage(language: MenuLanguage, isDevelopment: boolean): void {
  const resolvedLanguage: MenuLanguage = language === 'zh' ? 'zh' : 'en';
  console.log(`[Menu] Setting application menu language: ${resolvedLanguage}`);
  const menu = Menu.buildFromTemplate(buildAppMenuTemplate(resolvedLanguage, isDevelopment));
  Menu.setApplicationMenu(menu);
}
