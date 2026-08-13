import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyTaskMoverPlugin from "../main";
import type { ClickAction, Language } from "./settings";
import { t, setLanguage } from "./i18n";

export class DailyTaskMoverSettingTab extends PluginSettingTab {
  plugin: DailyTaskMoverPlugin;

  constructor(app: App, plugin: DailyTaskMoverPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // 每次渲染时即时取当前语言，避免切换语言后标签停留在旧语言
    const clickActionLabels: Record<ClickAction, string> = {
      popup: t("clickAction.popup"),
      prev: t("clickAction.prev"),
      next: t("clickAction.next"),
      none: t("clickAction.none"),
    };
    const languageLabels: Record<Language, string> = {
      auto: t("language.auto"),
      en: t("language.en"),
      "zh-cn": t("language.zh-cn"),
    };

    new Setting(containerEl)
      .setName(t("settings.language"))
      .setDesc(t("settings.languageDesc"))
      .addDropdown((dd) => {
        for (const key of Object.keys(languageLabels) as Language[]) {
          dd.addOption(key, languageLabels[key]);
        }
        dd.setValue(this.plugin.settings.language).onChange(async (val) => {
          this.plugin.settings.language = val as Language;
          await this.plugin.saveSettings();
          setLanguage(this.plugin.settings.language);
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.leftClickAction"))
      .setDesc(t("settings.leftClickActionDesc"))
      .addDropdown((dd) => {
        for (const key of Object.keys(clickActionLabels) as ClickAction[]) {
          dd.addOption(key, clickActionLabels[key]);
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
        for (const key of Object.keys(clickActionLabels) as ClickAction[]) {
          dd.addOption(key, clickActionLabels[key]);
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