import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyTaskMoverPlugin from "../main";

export class DailyTaskMoverSettingTab extends PluginSettingTab {
  plugin: DailyTaskMoverPlugin;

  constructor(app: App, plugin: DailyTaskMoverPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("启用前一天")
      .setDesc("启用将任务移动到前一天日记的命令与右键菜单项。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enablePreviousDay)
          .onChange(async (val) => {
            this.plugin.settings.enablePreviousDay = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("启用后一天")
      .setDesc("启用将任务移动到后一天日记的命令与右键菜单项。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableNextDay)
          .onChange(async (val) => {
            this.plugin.settings.enableNextDay = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("折叠到二级目录")
      .setDesc("开启后右键菜单的移动动作收纳进「daily task mover」父项的二级子菜单。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.collapseToSubmenu)
          .onChange(async (val) => {
            this.plugin.settings.collapseToSubmenu = val;
            await this.plugin.saveSettings();
          })
      );
  }
}
