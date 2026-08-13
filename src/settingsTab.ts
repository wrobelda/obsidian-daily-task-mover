import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyTaskMoverPlugin from "../main";
import type { ClickAction } from "./settings";

const CLICK_ACTION_LABELS: Record<ClickAction, string> = {
  popup: "弹出菜单",
  prev: "移动到前一天",
  next: "移动到后一天",
  none: "无动作",
};

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
      .setName("左键点击动作")
      .setDesc("左键点击 task 行尾图标时执行的动作。")
      .addDropdown((dd) => {
        for (const key of Object.keys(CLICK_ACTION_LABELS) as ClickAction[]) {
          dd.addOption(key, CLICK_ACTION_LABELS[key]);
        }
        dd.setValue(this.plugin.settings.leftClickAction).onChange(
          async (val) => {
            this.plugin.settings.leftClickAction = val as ClickAction;
            await this.plugin.saveSettings();
            this.display();
          }
        );
      });

    new Setting(containerEl)
      .setName("右键点击动作")
      .setDesc("右键点击 task 行尾图标时执行的动作。")
      .addDropdown((dd) => {
        for (const key of Object.keys(CLICK_ACTION_LABELS) as ClickAction[]) {
          dd.addOption(key, CLICK_ACTION_LABELS[key]);
        }
        dd.setValue(this.plugin.settings.rightClickAction).onChange(
          async (val) => {
            this.plugin.settings.rightClickAction = val as ClickAction;
            await this.plugin.saveSettings();
            this.display();
          }
        );
      });

    // 仅当左键或右键动作为“弹出菜单”时，方向开关才有意义（作用于 popup 菜单项）。
    const popupActive =
      this.plugin.settings.leftClickAction === "popup" ||
      this.plugin.settings.rightClickAction === "popup";

    new Setting(containerEl)
      .setName("启用前一天")
      .setDesc(
        "在弹出菜单中显示“移动到前一天”选项。仅当左键或右键点击动作为“弹出菜单”时可修改。"
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.enablePreviousDay)
          .setDisabled(!popupActive)
          .onChange(async (val) => {
            this.plugin.settings.enablePreviousDay = val;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("启用后一天")
      .setDesc(
        "在弹出菜单中显示“移动到后一天”选项。仅当左键或右键点击动作为“弹出菜单”时可修改。"
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.enableNextDay)
          .setDisabled(!popupActive)
          .onChange(async (val) => {
            this.plugin.settings.enableNextDay = val;
            await this.plugin.saveSettings();
          });
      });
  }
}