import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyTaskMoverPlugin from "../main";
import type { ClickAction } from "./settings";
import { t } from "./i18n";

const CLICK_ACTION_LABELS: Record<ClickAction, string> = {
  popup: t("clickAction.popup"),
  prev: t("clickAction.prev"),
  next: t("clickAction.next"),
  none: t("clickAction.none"),
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
      .setName(t("settings.leftClickAction"))
      .setDesc(t("settings.leftClickActionDesc"))
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
      .setName(t("settings.rightClickAction"))
      .setDesc(t("settings.rightClickActionDesc"))
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
      .setName(t("settings.enablePreviousDay"))
      .setDesc(t("settings.enablePreviousDayDesc"))
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
      .setName(t("settings.enableNextDay"))
      .setDesc(t("settings.enableNextDayDesc"))
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