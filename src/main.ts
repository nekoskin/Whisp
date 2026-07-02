import { invoke } from "@tauri-apps/api/core";
import { writeText as clipboardWrite, readText as clipboardRead } from "@tauri-apps/plugin-clipboard-manager";
import { scan as qrScan, Format as QrFormat } from "@tauri-apps/plugin-barcode-scanner";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import "./styles.css";

const ICONS = {
  power: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  bolt: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  log: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  refresh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  play: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  link: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  ping: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  pencil: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  kebab: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>`,
  clipboard: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
  qr: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="17.5" y1="14" x2="17.5" y2="17.5"/><line x1="14" y1="17.5" x2="21" y2="17.5"/></svg>`,
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
};

interface MultiBridgeEntry {
  id: string;
  address: string;
  rules: string[]; // domain/IP/CIDR patterns routed to this bridge
}

interface AppSettings {
  conn_key: string;
  auto_connect: boolean;
  theme: string;
  mihomo_port: number;
  socks_addr: string;
  kill_switch: boolean;
  dns_redirect: boolean;
  ipv6: boolean;
  tun_stack: string;
  hwid: boolean;
  auth_tip: boolean;
  secret: string;
  custom_dns?: string[];
  vpn_dns?: string;
  spoof_ips?: string;
  multi_bridges?: MultiBridgeEntry[];
  tls_fingerprint?: string;
  bypass_ru?: boolean;
  socks_user?: string;
  socks_pass?: string;
  allow_lan?: boolean;
  log_level?: string;
  routing_mode?: string;
  dns_mode?: string;
  dns_strategy?: string;
  mtu?: number;
  tls_fragment?: boolean;
  sub_auto_update?: boolean;
}

interface Profile { id: string; name: string; key: string; }

interface Subscription {
  id: string;
  name: string;
  url: string;
  keys: string[];
  servers: unknown[];
  updated: string;
}

type Page = "home" | "routing" | "logs" | "settings";
type Lang = "ru" | "en" | "zh" | "fa";

interface RoutingRule {
  id: string;
  kind: "domain" | "process" | "domain-keyword" | "domain-full" | "ip";
  value: string;
  action: "DIRECT" | "PROXY" | "REJECT";
}

const i18n: Record<Lang, Record<string, string>> = {
  ru: {
    home: "Главная", profiles: "Профили", routing: "Маршруты", logs: "Журнал", settings: "Настройки",
    disconnected: "Отключено", connected: "Подключено",
    keyPlaceholder: "Вставьте ключ...", connect: "Connect", disconnect: "Disconnect",
    ipInfo: "IP ИНФОРМАЦИЯ", ipAddress: "IP Адрес", location: "Местоположение", provider: "Провайдер",
    system: "СИСТЕМА", os: "ОС", uptime: "Время работы", version: "Версия", admin: "Админ",
    activeConns: "Активные соединения", connectToSee: "Подключитесь чтобы увидеть соединения",
    noProfiles: "Нет сохранённых профилей", addProfile: "Добавить ключ",
    keysSection: "Ключи", noKeys: "Нет сохранённых ключей и подписок",
    pasteFromClipboard: "Вставить из буфера обмена", scanQr: "Сканировать QR-код", qrScanFailed: "Не удалось отсканировать QR-код", pasteJson: "Вставить JSON", copyJson: "Копировать JSON",
    jsonData: "JSON", jsonParseError: "Некорректный JSON", jsonImported: "Импортировано записей:", jsonCopied: "JSON скопирован в буфер обмена",
    clipboardEmpty: "Буфер обмена пуст", clipboardReadFailed: "Не удалось прочитать буфер обмена", clipboardWriteFailed: "Не удалось скопировать в буфер обмена",
    pasteUnrecognized: "Не удалось распознать содержимое. Ожидается whispera:// ключ или https:// ссылка",
    refreshAllSubs: "Обновить подписки", subsRefreshedSummary: "Обновлено подписок:",
    subAutoUpdateOn: "Автообновление: Вкл", subAutoUpdateOff: "Автообновление: Выкл",
    systemLog: "Системный журнал", logReady: "Система готова. Ожидание логов...",
    mixedPort: "Смешанный порт :", bindAddr: "Привязать адрес :", tunStack: "Tun Stack :", shareProxy: "Общий доступ к прокси",
    theme: "Тема :", dark: "Тёмная", auto: "Белая", dnsRedirect: "DNS перенаправление :",
    ipv6Label: "IPv6 :", secretLabel: "Secret :", copy: "Копировать",
    hwid: "HWID :", autostart: "Автозапуск :", authTip: "Совет по аутентификации :",
    config: "Конфиг :", open: "Открыть", update: "Обновить :",
    openRepo: "Открыть репо", checkUpdates: "Проверить обновления",
    installed: "Установлено в актуальной версии",
    profileName: "Имя профиля", profileKey: "Ключ подключения",
    save: "Сохранить", cancel: "Отмена",
    mihomo: "MIHOMO", whisp: "WHISP",
    tunnel: "ТУННЕЛЬ", server: "Сервер", duration: "Длительность",
    proxy: "ПРОКСИ", port: "Порт", notSet: "не задан",
    clearLogs: "Очистить", active: "Активно", inactive: "Неактивно",
    connecting: "Подключение...", disconnecting: "Отключение...",
    killSwitch: "Kill Switch",
    routingTitle: "Маршруты", routingDesc: "Укажите приложения или сайты которые идут напрямую или через прокси",
    addSite: "Добавить сайт", addApp: "Выбрать приложение", domain: "Домен", app: "Приложение",
    routeDirect: "Напрямую", routeProxy: "Прокси", noRules: "Правила не добавлены",
    domainHint: "Например: steampowered.com",
    discordVpn: "Прокси", discordDirect: "Напрямую",
    discordDesc: "Прокси — приложение запускается; Напрямую — голос работает",
    blocklist: "Блок-лист", blocklistTitle: "Блок-лист", blocklistDesc: "Заблокированные домены и приложения — трафик полностью блокируется",
    blockDomain: "Заблокировать домен", blockApp: "Заблокировать приложение", blockKeyword: "По ключевому слову", blockIp: "Заблокировать IP/CIDR",
    noBlocked: "Список пуст", blocked: "Заблокирован", domainBlockHint: "Например: tiktok.com",
    keywordHint: "Например: tracker", ipHint: "Например: 1.2.3.0/24",
    subscriptions: "Подписки", addSubscription: "Добавить подписку",
    subName: "Название", subUrl: "URL подписки", subUrlHint: "https://server/sub/TOKEN",
    noSubscriptions: "Нет подписок", subKeys: "ключей", subRefreshing: "Обновление...", subAdded: "Подписка добавлена",
    subRefresh: "Обновить", subDelete: "Удалить", subLastUpdated: "Обновлено",
    subSelectKey: "Выбрать ключ", subRename: "Переименовать", more: "Ещё",
    pingKey: "Пинг", pingAll: "Пинг всех", pingMs: "мс", pingTimeout: "timeout", pingRunning: "...",
    loading: "Загрузка…",
    copied: "Скопировано",
    vpnConnected: "Подключено",
    switchingKey: "Переключение ключа...", pleaseWait: "Подождите, идёт переключение...",
    vpnDisconnected: "Отключено",
    muxOn: "MUX включён",
    muxOff: "MUX выключен",
    muxEnabled: "MUX включён",
    muxDisabled: "MUX выключен",
    connClosed: "Соединение закрыто",
    bridgeUpdated: "Мост обновлён",
    speedUpdated: "Скорость обновлена",
    portUpdated: "Порт обновлён",
    noRecommendation: "Нет рекомендации",
    noActiveConns: "Нет активных соединений",
    agentTransport: "Агент транспорта",
    agentNotRunning: "Агент не запущен",
    agentTransportUCB: "Агент транспорта (UCB)",
    agentState: "Состояние",
    agentProbesRotations: "Зондов / ротаций",
    agentQValues: "Q-значения транспортов",
    agentApply: "Применить рекомендацию",
    agentRefresh: "Обновить",
    agentIdle: "ожидание",
    agentProbing: "зондирование",
    agentRotating: "ротация",
    agentConnected: "подключён",
    agentBlocked: "заблокирован",
    agentNoData: "нет данных",
    connCountLabel: "Соединений",
    connNoActive: "Нет активных соединений",
    connKeyEncrypted: "зашифрован",
    connStatusActive: "активно",
    connStatusConnecting: "подключение",
    connStatusFailed: "ошибка",
    connStatusOff: "откл.",
    connMuxTitle: "Мультиплексирование",
    connDuplicate: "Дублировать",
    connDup: "Дублировано",
    connClose: "Закрыть соединение",
    connApply: "Применить",
    connPort: "Порт",
    connBridge: "Мост",
    connSpeed: "Скорость KB/s",
    connObfs: "Обфускация (приманка)",
    connTransportSecureTitle: "Когда ВКЛЮЧЕНО — доверяет встроенному шифрованию транспорта (TLS/QUIC) и пропускает двойную обфускацию. ВЫКЛЮЧЕНО по умолчанию — обфускация применяется поверх любого транспорта для защиты от ТСПУ/DPI.",
    connMarionetteTitle: "Marionette имитирует поведение мессенджера — паттерны трафика, тайминги, размеры пакетов. Выберите профиль, ближайший к реальному использованию. Нейросеть может менять профиль автоматически.",
    connTransportSecureOn: "Transport Secure ON — двойная обфускация отключена",
    connTransportSecureOff: "Transport Secure OFF — обфускация всегда включена",
    marionetteDisabled: "Marionette отключён",
    profileNone: "— нет —",
    profileMusicSep: "── Музыка ──",
    profileVideoSep: "── Видео ──",
    fpRandom: "Случайный",
    fpBrowser: "Браузер",
    fpApplyNow: "Применить",
    ruleBlock: "Блок",
    ruleDirect: "Прямой",
    ruleSite: "сайт",
    ruleKeyword: "ключ",
    ruleApp: "приложение",
    ruleNoRules: "Нет правил",
    ruleViaVpn: "Прокси",
    ruleDirect2: "Напрямую",
    ruleAdd: "Добавить правило",
    ruleSiteType: "Сайт",
    ruleAppType: "Приложение",
    ruleKeywordType: "Ключевое слово",
    rulePlaceholder: "например: youtube.com",
    ruleKeywordPlaceholder: "ключевое слово",
    rulesBrowseExe: "Выбрать .exe",
    rulesRunning: "Из процессов",
    rulesPickApp: "Выбрать приложение",
    rulesSearchApp: "Поиск приложения...",
    rulesTitle: "Правила",
    rulesSearchProcess: "Поиск процесса...",
    rulesNoProcesses: "Нет процессов",
    multibridgeTitle: "Мультибридж",
    multibridgeDesc: "Трафик для выбранных доменов — через другой сервер.",
    multibridgeDomains: "домены через запятую",
    multibridgeNone: "Нет бриджей",
    multibridgeAllTraffic: "весь трафик",
    subUpdated: "Подписка обновлена",
    subUpdateAvailableToast: "Доступно обновление подписки",
    subUpdateFailed: "Ошибка обновления",
    secretCopied: "Secret скопирован",
    updateAvailable: "Установлена актуальная версия",
    updateCheckFailed: "Не удалось проверить обновления",
    reconnectToApply: "Изменение вступит в силу после переподключения",
    dnsServers: "DNS серверы",
    dnsCommaSep: "Через запятую, пусто = по умолчанию",
    vpnDns: "Прокси DNS (клиент)",
    vpnDnsHint: "DNS для прокси-клиента. 'Провайдер' = системный резолвер",
    dnsMode: "Режим DNS",
    dnsStrategy: "DNS-резолвер",
    dnsFakeip: "Поддельный",
    dnsLocal: "Локальный",
    dnsStrategyHint: "Поддельный (fake-IP) — домены резолвятся внутри тоннеля, IP не видны провайдеру. Локальный — системный резолвер устройства.",
    mtuLabel: "MTU",
    mtuHint: "Размер MTU для TUN-интерфейса (576–9000, по умолчанию 1500)",
    tlsFragment: "Фрагментация TLS",
    tlsFragmentHint: "Разбивает TLS ClientHello на несколько TCP-сегментов, чтобы DPI не видел SNI целиком",
    isp: "Провайдер",
    bypassRu: "Обходить .ru / .su напрямую",
    bypassRuHint: "GEOIP Россия + домены .ru/.su идут напрямую, минуя VPN",
    advanced: "Расширенные",
    spoofIpsHint: "Список локальных IP для ротации источника. Пусто = отключено",
    ipSpoofing: "IP Spoofing",
    allowLan: "Разрешить LAN",
    allowLanHint: "Другие устройства в сети смогут использовать прокси",
    logLevel: "Уровень логов",
    routingMode: "Режим маршрутизации",
    socksAuth: "SOCKS5 аутентификация",
    socksUser: "Логин",
    socksPass: "Пароль",
    socksProxyUrl: "URL прокси",
    socksSave: "Сохранить",
    reconnectRequired: "Переподключитесь для применения правила",
    logSearchPlaceholder: "Поиск в логах...",
    logAll: "Все",
    transportSet: "Транспорт →",
    duplicated: "Дублировано",
    duplicatedTo: "Дублировано →",
    profileSet: "Профиль:",
    fingerprintSet: "Фингерпринт:",
    analysisDone: "Анализ завершён — риск DPI:",
    foundPorts: "Найдено",
    openPorts: "открытых портов",
    versionAvail: "Доступна версия",
    updateAvailableNew: "Доступно обновление",
    upToDate: "Последняя версия установлена",
    installUpdate: "Установить",
    openRelease: "Открыть релиз",
    currentVersion: "Текущая версия",
    latestVersion: "Последняя версия",
    releaseNotes: "Изменения",
  },
  en: {
    home: "Home", profiles: "Profiles", routing: "Routing", logs: "Logs", settings: "Settings",
    disconnected: "Disconnected", connected: "Connected",
    keyPlaceholder: "Paste key...", connect: "Connect", disconnect: "Disconnect",
    ipInfo: "IP INFORMATION", ipAddress: "IP Address", location: "Location", provider: "Provider",
    system: "SYSTEM", os: "OS", uptime: "Uptime", version: "Version", admin: "Admin",
    activeConns: "Active connections", connectToSee: "Connect to see connections",
    noProfiles: "No saved profiles", addProfile: "Add key",
    keysSection: "Keys", noKeys: "No saved keys or subscriptions",
    pasteFromClipboard: "Paste from clipboard", scanQr: "Scan QR code", qrScanFailed: "Failed to scan QR code", pasteJson: "Paste JSON", copyJson: "Copy JSON",
    jsonData: "JSON", jsonParseError: "Invalid JSON", jsonImported: "Imported entries:", jsonCopied: "JSON copied to clipboard",
    clipboardEmpty: "Clipboard is empty", clipboardReadFailed: "Failed to read clipboard", clipboardWriteFailed: "Failed to copy to clipboard",
    pasteUnrecognized: "Could not recognize the content. Expected a whispera:// key or an https:// link",
    refreshAllSubs: "Refresh subscriptions", subsRefreshedSummary: "Subscriptions refreshed:",
    subAutoUpdateOn: "Auto-update: On", subAutoUpdateOff: "Auto-update: Off",
    systemLog: "System Log", logReady: "System ready. Waiting for logs...",
    mixedPort: "Mixed port :", bindAddr: "Bind address :", tunStack: "Tun Stack :", shareProxy: "Share proxy",
    theme: "Theme :", dark: "Dark", auto: "Light", dnsRedirect: "DNS redirect :",
    ipv6Label: "IPv6 :", secretLabel: "Secret :", copy: "Copy",
    hwid: "HWID :", autostart: "Autostart :", authTip: "Auth tip :",
    config: "Config :", open: "Open", update: "Update :",
    openRepo: "Open repo", checkUpdates: "Check updates",
    installed: "Installed & up to date",
    profileName: "Profile name", profileKey: "Connection key",
    save: "Save", cancel: "Cancel",
    mihomo: "MIHOMO", whisp: "WHISP",
    tunnel: "TUNNEL", server: "Server", duration: "Duration",
    proxy: "PROXY", port: "Port", notSet: "not set",
    clearLogs: "Clear", active: "Active", inactive: "Inactive",
    connecting: "Connecting...", disconnecting: "Disconnecting...",
    killSwitch: "Kill Switch",
    routingTitle: "Routing", routingDesc: "Specify apps or sites that go direct or through proxy",
    addSite: "Add site", addApp: "Browse app", domain: "Domain", app: "Application",
    routeDirect: "Direct", routeProxy: "Proxy", noRules: "No rules added",
    domainHint: "e.g. steampowered.com",
    discordVpn: "Proxy", discordDirect: "Direct",
    discordDesc: "Proxy — app connects; Direct — voice works",
    blocklist: "Blocklist", blocklistTitle: "Blocklist", blocklistDesc: "Blocked domains and apps — traffic is completely rejected",
    blockDomain: "Block domain", blockApp: "Block application", blockKeyword: "By keyword", blockIp: "Block IP/CIDR",
    noBlocked: "List is empty", blocked: "Blocked", domainBlockHint: "e.g. tiktok.com",
    keywordHint: "e.g. tracker", ipHint: "e.g. 1.2.3.0/24",
    subscriptions: "Subscriptions", addSubscription: "Add subscription",
    subName: "Name", subUrl: "Subscription URL", subUrlHint: "https://server/sub/TOKEN",
    noSubscriptions: "No subscriptions", subKeys: "keys", subRefreshing: "Refreshing...", subAdded: "Subscription added",
    subRefresh: "Refresh", subDelete: "Delete", subLastUpdated: "Updated",
    subSelectKey: "Use key", subRename: "Rename", more: "More",
    pingKey: "Ping", pingAll: "Ping all", pingMs: "ms", pingTimeout: "timeout", pingRunning: "...",
    loading: "Loading…",
    copied: "Copied",
    vpnConnected: "Connected",
    switchingKey: "Switching key...", pleaseWait: "Please wait, switching in progress...",
    vpnDisconnected: "Disconnected",
    muxOn: "MUX on",
    muxOff: "MUX off",
    muxEnabled: "MUX enabled",
    muxDisabled: "MUX disabled",
    connClosed: "Connection closed",
    bridgeUpdated: "Bridge updated",
    speedUpdated: "Speed updated",
    portUpdated: "Port updated",
    noRecommendation: "No recommendation",
    noActiveConns: "No active connections",
    agentTransport: "Transport Agent",
    agentNotRunning: "Agent not running",
    agentTransportUCB: "Transport Agent (UCB)",
    agentState: "State",
    agentProbesRotations: "Probes / rotations",
    agentQValues: "Transport Q-values",
    agentApply: "Apply recommendation",
    agentRefresh: "Refresh",
    agentIdle: "idle",
    agentProbing: "probing",
    agentRotating: "rotating",
    agentConnected: "connected",
    agentBlocked: "blocked",
    agentNoData: "no data",
    connCountLabel: "Connections",
    connNoActive: "No active connections",
    connKeyEncrypted: "encrypted",
    connStatusActive: "active",
    connStatusConnecting: "connecting",
    connStatusFailed: "failed",
    connStatusOff: "off",
    connMuxTitle: "Multiplexing",
    connDuplicate: "Duplicate",
    connDup: "Duplicated",
    connClose: "Close connection",
    connApply: "Apply",
    connPort: "Port",
    connBridge: "Bridge",
    connSpeed: "Speed KB/s",
    connObfs: "Obfuscation (bait)",
    connTransportSecureTitle: "When ON — trusts the transport's built-in encryption (TLS/QUIC) and skips double-obfuscation. OFF by default — obfuscation is always applied on top of any transport to defeat DPI/TSPU.",
    connMarionetteTitle: "Marionette mimics messenger traffic behaviour — patterns, timings, packet sizes. Pick a profile matching your actual usage. The neural network can switch profiles automatically.",
    connTransportSecureOn: "Transport Secure ON — double-obfuscation disabled",
    connTransportSecureOff: "Transport Secure OFF — obfuscation always active",
    marionetteDisabled: "Marionette disabled",
    profileNone: "— none —",
    profileMusicSep: "── Music ──",
    profileVideoSep: "── Video ──",
    fpRandom: "Random",
    fpBrowser: "Browser",
    fpApplyNow: "Apply Now",
    ruleBlock: "Block",
    ruleDirect: "Direct",
    ruleSite: "site",
    ruleKeyword: "keyword",
    ruleApp: "app",
    ruleNoRules: "No rules",
    ruleViaVpn: "Proxy",
    ruleDirect2: "Direct",
    ruleAdd: "Add rule",
    ruleSiteType: "Site",
    ruleAppType: "App",
    ruleKeywordType: "Keyword",
    rulePlaceholder: "e.g. youtube.com",
    ruleKeywordPlaceholder: "keyword",
    rulesBrowseExe: "Browse .exe",
    rulesRunning: "Running",
    rulesPickApp: "Pick App",
    rulesSearchApp: "Search app...",
    rulesTitle: "Rules",
    rulesSearchProcess: "Search process...",
    rulesNoProcesses: "No processes",
    multibridgeTitle: "Multi-Bridge",
    multibridgeDesc: "Route specific domains through an alternate bridge.",
    multibridgeDomains: "domains, comma-separated",
    multibridgeNone: "None configured",
    multibridgeAllTraffic: "all traffic",
    subUpdated: "Subscription updated",
    subUpdateAvailableToast: "Subscription update available",
    subUpdateFailed: "Update failed",
    secretCopied: "Secret copied",
    updateAvailable: "Already up to date",
    updateCheckFailed: "Update check failed",
    reconnectToApply: "Change will take effect after reconnecting",
    dnsServers: "DNS Servers",
    dnsCommaSep: "Comma-separated, empty = default",
    vpnDns: "Proxy DNS (client)",
    vpnDnsHint: "DNS for the proxy client. 'ISP' = system resolver",
    dnsMode: "DNS mode",
    dnsStrategy: "DNS resolver",
    dnsFakeip: "Fake-IP",
    dnsLocal: "Local",
    dnsStrategyHint: "Fake-IP — domains resolved inside the tunnel, IPs hidden from the ISP. Local — device's system resolver.",
    mtuLabel: "MTU",
    mtuHint: "MTU size for the TUN interface (576–9000, default 1500)",
    tlsFragment: "TLS fragmentation",
    tlsFragmentHint: "Splits the TLS ClientHello across several TCP segments so DPI can't read the whole SNI",
    isp: "ISP",
    bypassRu: "Bypass .ru / .su direct",
    bypassRuHint: "GEOIP Russia + .ru/.su domains go direct, bypassing VPN",
    advanced: "Advanced",
    spoofIpsHint: "Local IPs for source rotation. Empty = disabled",
    ipSpoofing: "IP Spoofing",
    allowLan: "Allow LAN",
    allowLanHint: "Other devices on the network can use this proxy",
    logLevel: "Log Level",
    routingMode: "Routing Mode",
    socksAuth: "SOCKS5 Authentication",
    socksUser: "Username",
    socksPass: "Password",
    socksProxyUrl: "Proxy URL",
    socksSave: "Save",
    reconnectRequired: "Reconnect to apply the rule",
    logSearchPlaceholder: "Search logs...",
    logAll: "All",
    transportSet: "Transport →",
    duplicated: "Duplicated",
    duplicatedTo: "Duplicated →",
    profileSet: "Profile:",
    fingerprintSet: "Fingerprint:",
    analysisDone: "Analysis done — DPI risk:",
    foundPorts: "Found",
    openPorts: "open ports",
    versionAvail: "Version available:",
    updateAvailableNew: "Update Available",
    upToDate: "Up to date",
    installUpdate: "Install",
    openRelease: "Open Release",
    currentVersion: "Current version",
    latestVersion: "Latest version",
    releaseNotes: "Release notes",
  },
  zh: {
    home: "主页", profiles: "配置", routing: "路由", logs: "日志", settings: "设置",
    disconnected: "已断开", connected: "已连接",
    keyPlaceholder: "粘贴密钥...", connect: "连接", disconnect: "断开",
    ipInfo: "IP信息", ipAddress: "IP地址", location: "位置", provider: "运营商",
    system: "系统", os: "操作系统", uptime: "运行时间", version: "版本", admin: "管理员",
    activeConns: "活跃连接", connectToSee: "连接后查看连接",
    noProfiles: "无保存配置", addProfile: "添加密钥",
    keysSection: "密钥", noKeys: "没有已保存的密钥或订阅",
    pasteFromClipboard: "从剪贴板粘贴", scanQr: "扫描二维码", qrScanFailed: "二维码扫描失败", pasteJson: "粘贴 JSON", copyJson: "复制 JSON",
    jsonData: "JSON", jsonParseError: "JSON 格式无效", jsonImported: "已导入条目：", jsonCopied: "JSON 已复制到剪贴板",
    clipboardEmpty: "剪贴板为空", clipboardReadFailed: "读取剪贴板失败", clipboardWriteFailed: "复制到剪贴板失败",
    pasteUnrecognized: "无法识别内容。需要 whispera:// 密钥或 https:// 链接",
    refreshAllSubs: "更新订阅", subsRefreshedSummary: "已更新订阅：",
    subAutoUpdateOn: "自动更新：开", subAutoUpdateOff: "自动更新：关",
    systemLog: "系统日志", logReady: "系统就绪，等待日志...",
    mixedPort: "混合端口：", bindAddr: "绑定地址：", tunStack: "Tun堆栈：", shareProxy: "共享代理",
    theme: "主题：", dark: "深色", auto: "浅色", dnsRedirect: "DNS重定向：",
    ipv6Label: "IPv6：", secretLabel: "密钥：", copy: "复制",
    hwid: "HWID：", autostart: "自动启动：", authTip: "认证提示：",
    config: "配置：", open: "打开", update: "更新：",
    openRepo: "打开仓库", checkUpdates: "检查更新",
    installed: "已安装最新版本",
    profileName: "配置名称", profileKey: "连接密钥",
    save: "保存", cancel: "取消",
    mihomo: "MIHOMO", whisp: "WHISP",
    tunnel: "隧道", server: "服务器", duration: "时长",
    proxy: "代理", port: "端口", notSet: "未设置",
    clearLogs: "清空", active: "活跃", inactive: "非活跃",
    connecting: "连接中...", disconnecting: "断开中...",
    killSwitch: "终止开关",
    routingTitle: "路由", routingDesc: "指定直连或经代理的应用或网站",
    addSite: "添加网站", addApp: "选择应用", domain: "域名", app: "应用",
    routeDirect: "直连", routeProxy: "Proxy", noRules: "无规则",
    domainHint: "例如：steampowered.com",
    discordVpn: "Proxy", discordDirect: "直连",
    discordDesc: "代理 — 应用连接；直连 — 语音正常",
    blocklist: "黑名单", blocklistTitle: "黑名单", blocklistDesc: "已拦截域名和应用",
    blockDomain: "拦截域名", blockApp: "拦截应用", blockKeyword: "按关键词", blockIp: "拦截IP/CIDR",
    noBlocked: "列表为空", blocked: "已拦截", domainBlockHint: "例如：tiktok.com",
    keywordHint: "例如：tracker", ipHint: "例如：1.2.3.0/24",
    subscriptions: "订阅", addSubscription: "添加订阅",
    subName: "名称", subUrl: "订阅URL", subUrlHint: "https://server/sub/TOKEN",
    noSubscriptions: "无订阅", subKeys: "密钥", subRefreshing: "更新中...", subAdded: "订阅已添加",
    subRefresh: "刷新", subDelete: "删除", subLastUpdated: "已更新",
    subSelectKey: "使用密钥", subRename: "重命名", more: "更多",
    pingKey: "延迟", pingAll: "全部延迟", pingMs: "毫秒", pingTimeout: "超时", pingRunning: "...",
    loading: "加载中…",
    copied: "已复制",
    vpnConnected: "已连接",
    switchingKey: "正在切换密钥...", pleaseWait: "请稍候，正在切换...",
    vpnDisconnected: "已断开",
    muxOn: "MUX已开启",
    muxOff: "MUX已关闭",
    muxEnabled: "MUX已开启",
    muxDisabled: "MUX已关闭",
    connClosed: "连接已关闭",
    bridgeUpdated: "桥接已更新",
    speedUpdated: "速度已更新",
    portUpdated: "端口已更新",
    noRecommendation: "无推荐",
    noActiveConns: "无活跃连接",
    agentTransport: "传输代理",
    agentNotRunning: "代理未运行",
    agentTransportUCB: "传输代理 (UCB)",
    agentState: "状态",
    agentProbesRotations: "探测/轮换次数",
    agentQValues: "传输Q值",
    agentApply: "应用推荐",
    agentRefresh: "刷新",
    agentIdle: "空闲",
    agentProbing: "探测中",
    agentRotating: "轮换中",
    agentConnected: "已连接",
    agentBlocked: "已封锁",
    agentNoData: "无数据",
    connCountLabel: "连接数",
    connNoActive: "无活跃连接",
    connKeyEncrypted: "已加密",
    connStatusActive: "活跃",
    connStatusConnecting: "连接中",
    connStatusFailed: "失败",
    connStatusOff: "关闭",
    connMuxTitle: "多路复用",
    connDuplicate: "复制",
    connDup: "已复制",
    connClose: "关闭连接",
    connApply: "应用",
    connPort: "端口",
    connBridge: "桥接",
    connSpeed: "速度 KB/s",
    connObfs: "混淆（诱饵）",
    connTransportSecureTitle: "开启时 — 信任传输层内置加密（TLS/QUIC），跳过双重混淆。默认关闭 — 混淆始终叠加在任何传输之上以防御DPI。",
    connMarionetteTitle: "Marionette模拟即时通讯流量行为——流量模式、时序、数据包大小。选择与实际使用最接近的配置文件。神经网络可以自动切换配置文件。",
    connTransportSecureOn: "Transport Secure 开启 — 双重混淆已禁用",
    connTransportSecureOff: "Transport Secure 关闭 — 混淆始终启用",
    marionetteDisabled: "Marionette已禁用",
    profileNone: "— 无 —",
    profileMusicSep: "── 音乐 ──",
    profileVideoSep: "── 视频 ──",
    fpRandom: "随机",
    fpBrowser: "浏览器",
    fpApplyNow: "立即应用",
    ruleBlock: "拦截",
    ruleDirect: "直连",
    ruleSite: "站点",
    ruleKeyword: "关键词",
    ruleApp: "应用",
    ruleNoRules: "无规则",
    ruleViaVpn: "Proxy",
    ruleDirect2: "直连",
    ruleAdd: "添加规则",
    ruleSiteType: "站点",
    ruleAppType: "应用",
    ruleKeywordType: "关键词",
    rulePlaceholder: "例如：youtube.com",
    ruleKeywordPlaceholder: "关键词",
    rulesBrowseExe: "浏览 .exe",
    rulesRunning: "运行中",
    rulesPickApp: "选择应用",
    rulesSearchApp: "搜索应用...",
    rulesTitle: "规则",
    rulesSearchProcess: "搜索进程...",
    rulesNoProcesses: "无进程",
    multibridgeTitle: "多桥接",
    multibridgeDesc: "将特定域名的流量路由到备用桥接。",
    multibridgeDomains: "域名，逗号分隔",
    multibridgeNone: "未配置",
    multibridgeAllTraffic: "所有流量",
    subUpdated: "订阅已更新",
    subUpdateAvailableToast: "订阅有可用更新",
    subUpdateFailed: "更新失败",
    secretCopied: "Secret已复制",
    updateAvailable: "已是最新版本",
    updateCheckFailed: "检查更新失败",
    reconnectToApply: "重新连接后更改将生效",
    dnsServers: "DNS服务器",
    dnsCommaSep: "逗号分隔，留空=默认",
    vpnDns: "代理 DNS（客户端）",
    vpnDnsHint: "代理客户端DNS。'运营商'=系统解析器",
    dnsMode: "DNS 模式",
    dnsStrategy: "DNS 解析器",
    dnsFakeip: "虚假 IP",
    dnsLocal: "本地",
    dnsStrategyHint: "虚假IP — 域名在隧道内解析，运营商看不到真实IP。本地 — 使用设备系统解析器。",
    mtuLabel: "MTU",
    mtuHint: "TUN 接口的 MTU 大小（576–9000，默认 1500）",
    tlsFragment: "TLS 分片",
    tlsFragmentHint: "将 TLS ClientHello 拆分为多个 TCP 分段，使 DPI 无法读取完整 SNI",
    isp: "运营商",
    bypassRu: "直连 .ru / .su 域名",
    bypassRuHint: "俄罗斯IP + .ru/.su域名直连，不走VPN",
    advanced: "高级",
    spoofIpsHint: "用于源轮换的本地IP列表。留空=禁用",
    ipSpoofing: "IP欺骗",
    allowLan: "允许 LAN",
    allowLanHint: "局域网其他设备可使用此代理",
    logLevel: "日志级别",
    routingMode: "路由模式",
    socksAuth: "SOCKS5 认证",
    socksUser: "用户名",
    socksPass: "密码",
    socksProxyUrl: "代理 URL",
    socksSave: "保存",
    reconnectRequired: "重连以应用规则",
    logSearchPlaceholder: "搜索日志...",
    logAll: "全部",
    transportSet: "传输 →",
    duplicated: "已复制",
    duplicatedTo: "已复制 →",
    profileSet: "配置:",
    fingerprintSet: "指纹:",
    analysisDone: "分析完成 — DPI风险:",
    foundPorts: "找到",
    openPorts: "个开放端口",
    versionAvail: "可用版本:",
    updateAvailableNew: "有可用更新",
    upToDate: "已是最新版本",
    installUpdate: "安装",
    openRelease: "打开发布",
    currentVersion: "当前版本",
    latestVersion: "最新版本",
    releaseNotes: "发布说明",
  },
  fa: {
    home: "خانه", profiles: "پروفایل‌ها", routing: "مسیریابی", logs: "گزارش", settings: "تنظیمات",
    disconnected: "قطع شده", connected: "متصل",
    keyPlaceholder: "کلید را وارد کنید...", connect: "اتصال", disconnect: "قطع",
    ipInfo: "اطلاعات IP", ipAddress: "آدرس IP", location: "موقعیت", provider: "ارائه‌دهنده",
    system: "سیستم", os: "سیستم‌عامل", uptime: "مدت اجرا", version: "نسخه", admin: "مدیر",
    activeConns: "اتصالات فعال", connectToSee: "برای مشاهده متصل شوید",
    noProfiles: "پروفایلی ذخیره نشده", addProfile: "افزودن کلید",
    keysSection: "کلیدها", noKeys: "کلید یا اشتراکی ذخیره نشده",
    pasteFromClipboard: "جای‌گذاری از کلیپ‌بورد", scanQr: "اسکن کد QR", qrScanFailed: "اسکن کد QR ناموفق بود", pasteJson: "جای‌گذاری JSON", copyJson: "کپی JSON",
    jsonData: "JSON", jsonParseError: "JSON نامعتبر", jsonImported: "موارد وارد شده:", jsonCopied: "JSON در کلیپ‌بورد کپی شد",
    clipboardEmpty: "کلیپ‌بورد خالی است", clipboardReadFailed: "خواندن کلیپ‌بورد ناموفق بود", clipboardWriteFailed: "کپی در کلیپ‌بورد ناموفق بود",
    pasteUnrecognized: "محتوا شناسایی نشد. کلید whispera:// یا لینک https:// مورد نیاز است",
    refreshAllSubs: "به‌روزرسانی اشتراک‌ها", subsRefreshedSummary: "اشتراک‌های به‌روزشده:",
    subAutoUpdateOn: "به‌روزرسانی خودکار: روشن", subAutoUpdateOff: "به‌روزرسانی خودکار: خاموش",
    systemLog: "گزارش سیستم", logReady: "سیستم آماده است. منتظر گزارش...",
    mixedPort: "پورت ترکیبی:", bindAddr: "آدرس bind:", tunStack: "Tun Stack:", shareProxy: "اشتراک پراکسی",
    theme: "پوسته:", dark: "تیره", auto: "روشن", dnsRedirect: "هدایت DNS:",
    ipv6Label: "IPv6:", secretLabel: "رمز:", copy: "کپی",
    hwid: "HWID:", autostart: "شروع خودکار:", authTip: "راهنمای احراز هویت:",
    config: "پیکربندی:", open: "باز کردن", update: "بروزرسانی:",
    openRepo: "باز کردن مخزن", checkUpdates: "بررسی بروزرسانی",
    installed: "نسخه به‌روز است",
    profileName: "نام پروفایل", profileKey: "کلید اتصال",
    save: "ذخیره", cancel: "لغو",
    mihomo: "MIHOMO", whisp: "WHISP",
    tunnel: "تونل", server: "سرور", duration: "مدت",
    proxy: "پراکسی", port: "پورت", notSet: "تنظیم نشده",
    clearLogs: "پاک کردن", active: "فعال", inactive: "غیرفعال",
    connecting: "در حال اتصال...", disconnecting: "در حال قطع...",
    killSwitch: "Kill Switch",
    routingTitle: "مسیریابی", routingDesc: "برنامه‌ها یا سایت‌هایی که مستقیم یا از طریق پراکسی هستند را مشخص کنید",
    addSite: "افزودن سایت", addApp: "انتخاب برنامه", domain: "دامنه", app: "برنامه",
    routeDirect: "مستقیم", routeProxy: "Proxy", noRules: "قانونی اضافه نشده",
    domainHint: "مثلاً: steampowered.com",
    discordVpn: "Proxy", discordDirect: "مستقیم",
    discordDesc: "پراکسی — برنامه اتصال می‌یابد؛ مستقیم — صدا کار می‌کند",
    blocklist: "لیست سیاه", blocklistTitle: "لیست سیاه", blocklistDesc: "دامنه‌ها و برنامه‌های مسدود شده",
    blockDomain: "مسدود کردن دامنه", blockApp: "مسدود کردن برنامه", blockKeyword: "بر اساس کلیدواژه", blockIp: "مسدود کردن IP/CIDR",
    noBlocked: "لیست خالی است", blocked: "مسدود شده", domainBlockHint: "مثلاً: tiktok.com",
    keywordHint: "مثلاً: tracker", ipHint: "مثلاً: 1.2.3.0/24",
    subscriptions: "اشتراک‌ها", addSubscription: "افزودن اشتراک",
    subName: "نام", subUrl: "URL اشتراک", subUrlHint: "https://server/sub/TOKEN",
    noSubscriptions: "اشتراکی وجود ندارد", subKeys: "کلیدها", subRefreshing: "در حال بروزرسانی...", subAdded: "اشتراک اضافه شد",
    subRefresh: "بروزرسانی", subDelete: "حذف", subLastUpdated: "بروزرسانی شده",
    subSelectKey: "استفاده از کلید", subRename: "تغییر نام", more: "بیشتر",
    pingKey: "پینگ", pingAll: "پینگ همه", pingMs: "میلی‌ثانیه", pingTimeout: "تایم‌اوت", pingRunning: "...",
    loading: "در حال بارگذاری…",
    copied: "کپی شد",
    vpnConnected: "متصل شد",
    switchingKey: "در حال تعویض کلید...", pleaseWait: "لطفاً صبر کنید، در حال تعویض...",
    vpnDisconnected: "قطع شد",
    muxOn: "MUX روشن شد",
    muxOff: "MUX خاموش شد",
    muxEnabled: "MUX فعال شد",
    muxDisabled: "MUX غیرفعال شد",
    connClosed: "اتصال بسته شد",
    bridgeUpdated: "پل به‌روز شد",
    speedUpdated: "سرعت به‌روز شد",
    portUpdated: "پورت به‌روز شد",
    noRecommendation: "توصیه‌ای وجود ندارد",
    noActiveConns: "اتصال فعالی وجود ندارد",
    agentTransport: "عامل انتقال",
    agentNotRunning: "عامل در حال اجرا نیست",
    agentTransportUCB: "عامل انتقال (UCB)",
    agentState: "وضعیت",
    agentProbesRotations: "تعداد بررسی / چرخش",
    agentQValues: "مقادیر Q انتقال",
    agentApply: "اعمال توصیه",
    agentRefresh: "بروزرسانی",
    agentIdle: "بیکار",
    agentProbing: "در حال بررسی",
    agentRotating: "در حال چرخش",
    agentConnected: "متصل",
    agentBlocked: "مسدود",
    agentNoData: "بدون داده",
    connCountLabel: "تعداد اتصالات",
    connNoActive: "اتصال فعالی وجود ندارد",
    connKeyEncrypted: "رمزنگاری شده",
    connStatusActive: "فعال",
    connStatusConnecting: "در حال اتصال",
    connStatusFailed: "ناموفق",
    connStatusOff: "خاموش",
    connMuxTitle: "مالتی‌پلکسینگ",
    connDuplicate: "تکرار",
    connDup: "تکرار شد",
    connClose: "بستن اتصال",
    connApply: "اعمال",
    connPort: "پورت",
    connBridge: "پل",
    connSpeed: "سرعت KB/s",
    connObfs: "مبهم‌سازی (طعمه)",
    connTransportSecureTitle: "وقتی روشن است — به رمزنگاری داخلی انتقال (TLS/QUIC) اعتماد می‌کند و مبهم‌سازی مضاعف را رد می‌کند. پیش‌فرض خاموش — مبهم‌سازی همیشه روی هر انتقال اعمال می‌شود.",
    connMarionetteTitle: "Marionette رفتار ترافیک پیام‌رسان را شبیه‌سازی می‌کند — الگوها، زمان‌بندی، اندازه بسته‌ها. پروفایلی نزدیک به استفاده واقعی انتخاب کنید. شبکه عصبی می‌تواند پروفایل را خودکار تغییر دهد.",
    connTransportSecureOn: "Transport Secure روشن — مبهم‌سازی مضاعف غیرفعال شد",
    connTransportSecureOff: "Transport Secure خاموش — مبهم‌سازی همیشه فعال است",
    marionetteDisabled: "Marionette غیرفعال شد",
    profileNone: "— هیچ —",
    profileMusicSep: "── موسیقی ──",
    profileVideoSep: "── ویدیو ──",
    fpRandom: "تصادفی",
    fpBrowser: "مرورگر",
    fpApplyNow: "اعمال",
    ruleBlock: "مسدود",
    ruleDirect: "مستقیم",
    ruleSite: "سایت",
    ruleKeyword: "کلیدواژه",
    ruleApp: "برنامه",
    ruleNoRules: "قانونی وجود ندارد",
    ruleViaVpn: "Proxy",
    ruleDirect2: "مستقیم",
    ruleAdd: "افزودن قانون",
    ruleSiteType: "سایت",
    ruleAppType: "برنامه",
    ruleKeywordType: "کلیدواژه",
    rulePlaceholder: "مثلاً: youtube.com",
    ruleKeywordPlaceholder: "کلیدواژه",
    rulesBrowseExe: "انتخاب .exe",
    rulesRunning: "در حال اجرا",
    rulesPickApp: "انتخاب برنامه",
    rulesSearchApp: "جستجوی برنامه...",
    rulesTitle: "قوانین",
    rulesSearchProcess: "جستجوی پروسه...",
    rulesNoProcesses: "پروسه‌ای وجود ندارد",
    multibridgeTitle: "چند پل",
    multibridgeDesc: "ترافیک دامنه‌های انتخابی را از طریق پل جایگزین هدایت کنید.",
    multibridgeDomains: "دامنه‌ها، جداشده با کاما",
    multibridgeNone: "پیکربندی نشده",
    multibridgeAllTraffic: "همه ترافیک",
    subUpdated: "اشتراک به‌روز شد",
    subUpdateAvailableToast: "بروزرسانی اشتراک موجود است",
    subUpdateFailed: "به‌روزرسانی ناموفق",
    secretCopied: "Secret کپی شد",
    updateAvailable: "نسخه به‌روز نصب است",
    updateCheckFailed: "بررسی به‌روزرسانی ناموفق",
    reconnectToApply: "تغییر پس از اتصال مجدد اعمال خواهد شد",
    dnsServers: "سرورهای DNS",
    dnsCommaSep: "جداشده با کاما، خالی = پیش‌فرض",
    vpnDns: "Proxy DNS (کلاینت)",
    vpnDnsHint: "DNS برای کلاینت پراکسی. 'ISP' = رزولور سیستم",
    dnsMode: "حالت DNS",
    dnsStrategy: "رزولور DNS",
    dnsFakeip: "جعلی (Fake-IP)",
    dnsLocal: "محلی",
    dnsStrategyHint: "جعلی (fake-IP) — دامنه‌ها داخل تونل حل می‌شوند و IP از ISP پنهان است. محلی — رزولور سیستم دستگاه.",
    mtuLabel: "MTU",
    mtuHint: "اندازه MTU برای رابط TUN (۵۷۶–۹۰۰۰، پیش‌فرض ۱۵۰۰)",
    tlsFragment: "قطعه‌قطعه‌سازی TLS",
    tlsFragmentHint: "ClientHello در TLS را به چند بخش TCP تقسیم می‌کند تا DPI نتواند کل SNI را بخواند",
    isp: "ISP",
    bypassRu: "دور زدن .ru / .su مستقیم",
    bypassRuHint: "دامنه‌های روسی و GEOIP Russia مستقیم، بدون VPN",
    advanced: "پیشرفته",
    spoofIpsHint: "لیست IP‌های محلی برای چرخش منبع. خالی = غیرفعال",
    ipSpoofing: "جعل IP",
    allowLan: "اجازه LAN",
    allowLanHint: "سایر دستگاه‌های شبکه می‌توانند از این پروکسی استفاده کنند",
    logLevel: "سطح لاگ",
    routingMode: "حالت مسیریابی",
    socksAuth: "احراز هویت SOCKS5",
    socksUser: "نام کاربری",
    socksPass: "رمز عبور",
    socksProxyUrl: "آدرس پروکسی",
    socksSave: "ذخیره",
    reconnectRequired: "برای اعمال قانون دوباره متصل شوید",
    logSearchPlaceholder: "جستجو در گزارش‌ها...",
    logAll: "همه",
    transportSet: "انتقال →",
    duplicated: "کپی شد",
    duplicatedTo: "کپی شد →",
    profileSet: "پروفایل:",
    fingerprintSet: "اثر انگشت:",
    analysisDone: "تحلیل انجام شد — خطر DPI:",
    foundPorts: "یافت شد",
    openPorts: "پورت باز",
    versionAvail: "نسخه موجود:",
    updateAvailableNew: "به‌روزرسانی موجود است",
    upToDate: "به‌روز است",
    installUpdate: "نصب",
    openRelease: "باز کردن انتشار",
    currentVersion: "نسخه فعلی",
    latestVersion: "آخرین نسخه",
    releaseNotes: "یادداشت‌های انتشار",
  },
};

let currentPage: Page = "home";
let lang: Lang = "ru";
let isConnected = false;
let isConnecting = false;



const isAndroid = /android/i.test(navigator.userAgent);

let _notifGranted = false;
async function initNotifications(): Promise<void> {
  try {
    _notifGranted = await isPermissionGranted();
    if (!_notifGranted) {
      _notifGranted = (await requestPermission()) === "granted";
    }
  } catch { _notifGranted = false; }
}

function osNotify(title: string, body: string): void {
  if (!_notifGranted) return;
  try { sendNotification({ title, body }); } catch { /**/ }
}

let settings: AppSettings = {
  conn_key: "", auto_connect: false, theme: "dark", mihomo_port: 9887,
  socks_addr: "127.0.0.1", kill_switch: false, dns_redirect: false,
  ipv6: true, tun_stack: "Mixed", hwid: true, auth_tip: true, secret: "",
  dns_strategy: "fakeip", mtu: 1500, tls_fragment: false, sub_auto_update: true,
};

let profiles: Profile[] = [];
let subscriptions: Subscription[] = [];
let pingResults: Map<string, number | "pinging" | "timeout"> = new Map();
let subUpdateAvailable: Set<string> = new Set();
let subAutoCheckTimer: ReturnType<typeof setInterval> | null = null;
let routingRules: RoutingRule[] = [];
let blocklistRules: RoutingRule[] = [];
let multiBridges: MultiBridgeEntry[] = [];
let currentFingerprint = localStorage.getItem("tls_fingerprint") || "chrome";
let logLines: string[] = [];
let connectTime: number | null = null;
let sysInfo = { os: "—", uptime: "—", version: "v0.1.4", admin: false };

function t(key: string): string { return i18n[lang][key] || key; }

function getServerHost(): string {
  const key = settings.conn_key.trim();
  if (!key) return "";
  if (key.startsWith("whispera://")) {
    // Try base64-JSON format first
    try {
      const raw = key.slice("whispera://".length).split("?")[0];
      const decoded = atob(raw);
      const j = JSON.parse(decoded) as Record<string, unknown>;
      const srv = (j.server as string) || "";
      if (srv) return srv; // "host:port"
    } catch { /* not base64 JSON */ }
    // Legacy format: whispera://host:port?params
    try {
      const u = new URL(key);
      const host = u.hostname;
      if (!host || host.includes("=") || (host.length > 40 && !host.includes("."))) return "";
      return u.host;
    } catch { return ""; }
  }
  return "";
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function genSecret(): string {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 16 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

function loadProfiles(): void { try { const r = localStorage.getItem("whisp_profiles"); if (r) profiles = JSON.parse(r); } catch {/**/ } }
function saveProfiles(): void { localStorage.setItem("whisp_profiles", JSON.stringify(profiles)); }

async function loadSubscriptions(): Promise<void> {
  try { subscriptions = await invoke<Subscription[]>("get_subscriptions"); } catch {/**/ }
}

async function autoCheckSubscriptions(): Promise<void> {
  const newlyAvailable: Subscription[] = [];
  for (const sub of subscriptions) {
    try {
      const remote = await invoke<Subscription>("check_subscription_update", { id: sub.id });
      // Only flag+notify once per pending update — re-checking every cycle
      // shouldn't re-notify for the same still-unrefreshed version.
      if (remote && remote.updated !== sub.updated && !subUpdateAvailable.has(sub.id)) {
        subUpdateAvailable.add(sub.id);
        newlyAvailable.push(sub);
      }
    } catch {/**/}
  }
  if (newlyAvailable.length === 0) return;
  if (currentPage === "home") renderPage();
  const names = newlyAvailable.map(s => s.name || s.url).join(", ");
  showToast(`${t("subUpdateAvailableToast")}: ${names}`, "info", 5000);
  osNotify(t("subUpdateAvailableToast"), names);
}

const SUB_AUTO_CHECK_INTERVAL_MS = 10 * 60 * 1000;

function startSubAutoCheck(): void {
  stopSubAutoCheck();
  if (!settings.sub_auto_update) return;
  subAutoCheckTimer = setInterval(() => autoCheckSubscriptions(), SUB_AUTO_CHECK_INTERVAL_MS);
}

function stopSubAutoCheck(): void {
  if (subAutoCheckTimer) { clearInterval(subAutoCheckTimer); subAutoCheckTimer = null; }
}
function loadLang(): void { const s = localStorage.getItem("whisp_lang"); if (s === "en" || s === "ru" || s === "zh" || s === "fa") lang = s as Lang; }
function saveLang(): void { localStorage.setItem("whisp_lang", lang); }

/* ===================== BACKEND ===================== */
async function loadSettings(): Promise<void> {
  try { const s = await invoke<AppSettings>("get_app_settings"); settings = { ...settings, ...s }; } catch {/**/ }
  if (!settings.secret) settings.secret = genSecret();
  multiBridges = settings.multi_bridges ?? [];
}

async function persistSettings(): Promise<void> {
  settings.multi_bridges = multiBridges;
  try { await invoke("save_app_setting", { settings }); } catch {/**/ }
}

async function persistMultiBridges(): Promise<void> {
  settings.multi_bridges = multiBridges;
  await persistSettings();
}

async function loadRoutingRules(): Promise<void> {
  try { routingRules = await invoke<RoutingRule[]>("get_routing_rules"); } catch {/**/ }
}

async function persistRoutingRules(): Promise<void> {
  try { await invoke("save_routing_rules", { rules: routingRules }); } catch {/**/ }
}

async function loadBlocklist(): Promise<void> {
  try { blocklistRules = await invoke<RoutingRule[]>("get_blocklist"); } catch {/**/ }
}

async function persistBlocklist(): Promise<void> {
  try { await invoke("save_blocklist", { rules: blocklistRules }); } catch {/**/ }
}


async function doConnect(): Promise<void> {
  isConnecting = true;
  if (currentPage === "home") renderPage();

  try {
    const msg = await invoke<string>("connect");
    isConnected = true;
    connectTime = Date.now();
    addLog("✓ " + msg);
    startLogPolling();
    playConnectSound();
    showToast(t("vpnConnected"), "success", 4000);
    if (!isAndroid) osNotify("Whisp VPN", t("vpnConnected"));
  } catch (e) {
    addLog("✗ " + e);
    showToast(String(e), "error", 5000);
    osNotify("Whisp VPN — ошибка", String(e));
  }
  isConnecting = false;
  if (currentPage === "home") renderPage();
}

async function doDisconnect(): Promise<void> {
  isConnecting = true;
  if (currentPage === "home") renderPage();
  try {
    const msg = await invoke<string>("disconnect");
    isConnected = false;
    connectTime = null;
    stopLogPolling();
    addLog("○ " + msg);
    playDisconnectSound();
    showToast(t("vpnDisconnected"), "info");
    if (!isAndroid) osNotify("Whisp VPN", t("vpnDisconnected"));
  } catch (e) {
    addLog("✗ " + e);
    showToast(String(e), "error", 5000);
  }
  isConnecting = false;
  if (currentPage === "home") renderPage();
}

// Switches the active connection key. If a tunnel is already up (or mid-
// connect), live-reconnects with the new key instead of just storing it —
// otherwise the change would silently do nothing until the user manually
// disconnects and reconnects themselves.
async function switchToKey(newKey: string): Promise<void> {
  if (isConnecting) {
    showToast(t("pleaseWait"), "info", 2000);
    return;
  }
  const wasActive = isConnected;
  const isSameKey = settings.conn_key === newKey;
  settings.conn_key = newKey;
  persistSettings();
  currentPage = "home";
  renderNav();
  renderPage();
  if (!wasActive || isSameKey) return;
  showToast(t("switchingKey"), "info", 2500);
  await doDisconnect();
  await doConnect();
}

async function checkStatus(): Promise<void> {
  try {
    const was = isConnected;
    isConnected = await invoke<boolean>("get_status");
    if (isConnected && !was && connectTime === null) connectTime = Date.now();
  } catch {/**/ }
}

/* Site checks — update DOM in-place, no flicker */
async function fetchSysInfo(): Promise<void> {
  try {
    const info = await invoke<{ os: string; uptime: string; version: string; admin: boolean }>("get_system_info");
    sysInfo = info;
  } catch {
    sysInfo = { os: "Windows (x64)", uptime: "0h 0m", version: "v0.1.4", admin: false };
  }
  updateSysDOM();
}

function updateSysDOM(): void {
  const os = document.getElementById("sys-os");
  const up = document.getElementById("sys-uptime");
  const ver = document.getElementById("sys-ver");
  const adm = document.getElementById("sys-admin");
  if (os) os.textContent = sysInfo.os;
  if (up) up.textContent = sysInfo.uptime;
  if (ver) ver.textContent = sysInfo.version;
  if (adm) { adm.textContent = sysInfo.admin ? "ON" : "OFF"; adm.className = "info-value " + (sysInfo.admin ? "badge-on" : "badge-off"); }
}

function _refreshLogBox(): void {
  const box = document.getElementById("log-box");
  if (!box) return;
  const filtered = logLines.filter(l => {
    if (logFilter !== "all" && logLineLevel(l) !== logFilter) return false;
    if (logSearch && !l.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });
  const colorized = filtered.map(l => {
    const lvl = logLineLevel(l);
    const cls = "log-line" + (lvl ? ` log-${lvl}` : "");
    return `<div class="${cls}">${esc(l)}</div>`;
  }).join("");
  box.innerHTML = colorized || `<div class="log-line log-info">${t("logReady")}</div>`;
  box.scrollTop = box.scrollHeight;
  const cnt = document.querySelector(".log-count");
  if (cnt) cnt.textContent = `${filtered.length}/${logLines.length}`;
}

function addLog(line: string): void {
  const ts = new Date().toLocaleTimeString();
  logLines.push("[" + ts + "] " + line);
  if (logLines.length > 500) logLines.shift();
  _refreshLogBox();
}

// go-client's console encoder pads short level names to a fixed width inside
// the brackets (e.g. "[INFO ]", "[WARN ]"), so match tolerating whitespace
// rather than an exact "[INFO]" substring.
function logLineLevel(line: string): "error" | "warn" | "info" {
  const u = line.toUpperCase();
  if (/\[\s*ERROR\s*\]/.test(u) || u.includes('"LEVEL":"ERROR"')) return "error";
  if (/\[\s*WARN\s*\]/.test(u) || u.includes('"LEVEL":"WARN"')) return "warn";
  if (/\[\s*INFO\s*\]/.test(u) || u.includes('"LEVEL":"INFO"')) return "info";
  // go-client (desktop + Android) logs via Go's stdlib `log` package — plain
  // "date time message" lines with no bracketed level tag. It marks failures
  // and warnings with literal text instead ("... failed: ...", "WARNING: ..."),
  // so classify by that real convention; anything else is routine info output.
  // "WARNING:" is checked first since a warning line can still mention "failed"
  // in its message body (e.g. "WARNING: Failed to connect...").
  if (u.includes("WARNING:")) return "warn";
  if (line.startsWith("✗") || u.includes("FATAL") || u.includes("FAILED") || u.includes("ERROR")) return "error";
  return "info";
}

function renderShell(): void {
  const app = document.getElementById("app");
  if (!app) return;

  if (!document.getElementById("toast-container")) {
    const tc = document.createElement("div");
    tc.id = "toast-container";
    tc.className = "toast-container";
    document.body.appendChild(tc);
  }

  document.body.classList.toggle("is-desktop", !isAndroid);

  app.innerHTML = `
    <header class="top-bar" id="top-bar">
      <span class="logo-wordmark">whisp</span>
      <div class="lang-switcher" id="lang-sw"></div>
    </header>
    <div class="main-content" id="main-content"></div>
    <nav class="bottom-nav" id="bottom-nav"></nav>
  `;

  renderNav();
  renderPage();
}

function renderNav(): void {
  const nav = document.getElementById("bottom-nav")!;
  const langSw = document.getElementById("lang-sw")!;

  const routeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 9v3a3 3 0 0 0 3 3h6"/></svg>`;
  const items: { id: Page; icon: string; label: string }[] = [
    { id: "home",        icon: ICONS.home,     label: t("home") },
    { id: "routing",    icon: routeIcon,      label: t("routing") },
    { id: "logs",       icon: ICONS.log,      label: t("logs") },
    { id: "settings",   icon: ICONS.settings, label: t("settings") },
  ];

  nav.innerHTML = items.map(n =>
    `<div class="bnav-item${currentPage === n.id ? " active" : ""}" data-page="${n.id}">
      <span class="bnav-icon">${n.icon}</span>
      <span class="bnav-label">${n.label}</span>
    </div>`
  ).join("");

  // Scroll active item into view
  const active = nav.querySelector<HTMLElement>(".bnav-item.active");
  active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

  langSw.innerHTML = `
    <button class="lang-btn ${lang === "ru" ? "active" : ""}" data-lang="ru">RU</button>
    <button class="lang-btn ${lang === "en" ? "active" : ""}" data-lang="en">EN</button>
    <button class="lang-btn ${lang === "zh" ? "active" : ""}" data-lang="zh">中</button>
    <button class="lang-btn ${lang === "fa" ? "active" : ""}" data-lang="fa">FA</button>
  `;

  nav.querySelectorAll<HTMLElement>(".bnav-item[data-page]").forEach(el => {
    el.addEventListener("click", () => {
      currentPage = el.dataset.page as Page;
      renderNav();
      renderPage();
    });
  });
  document.querySelectorAll<HTMLElement>(".lang-btn[data-lang]").forEach(el => {
    el.addEventListener("click", () => { lang = el.dataset.lang as Lang; saveLang(); renderNav(); renderPage(); });
  });
}

function renderPage(): void {
  document.body.classList.toggle("theme-light", settings.theme === "auto");
  const main = document.getElementById("main-content")!;
  switch (currentPage) {
    case "home": {
      const scrollY = main.scrollTop;
      main.innerHTML = renderHome();
      bindHomeEvents();
      bindProfileEvents();
      main.scrollTop = scrollY;
      break;
    }
    case "routing": main.innerHTML = renderRouting(); bindRoutingEvents(); break;
    case "logs":
      main.innerHTML = renderLogs();
      bindLogEvents();
      document.getElementById("btn-clear-logs")?.addEventListener("click", () => {
        logLines = [];
        logSearch = "";
        logFilter = "all";
        renderPage();
      });
      break;
    case "settings": main.innerHTML = renderSettings(); bindSettingsEvents(); break;
  }
  document.querySelectorAll<HTMLElement>(".copy-icon[data-copy]").forEach(el => {
    el.addEventListener("click", () => {
      clipboardWrite(el.dataset.copy || "");
      showToast(t("copied"), "success", 1800);
    });
  });
}

function updateHome(): void {
  if (currentPage !== "home") return;
  // Try targeted DOM patches first — avoids scroll reset and animation restarts.
  const dot = document.querySelector<HTMLElement>(".status-dot");
  const btnConnect = document.getElementById("btn-connect") as HTMLButtonElement | null;
  // If the connection card structure has changed (connected↔disconnected) or
  // the page hasn't been rendered yet, fall back to a full re-render.
  const cardIsConnected = btnConnect?.classList.contains("connected") ?? null;
  const stateMatches = cardIsConnected === isConnected;
  if (!dot || !btnConnect || !stateMatches) {
    renderPage();
    return;
  }
}

function showToast(msg: string, type: "success" | "error" | "info" = "info", duration = 3500): void {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-dot"></span><span class="toast-msg">${esc(msg)}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("toast-visible")));
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    toast.classList.add("toast-hiding");
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

function tickUptime(): void {
  const el = document.getElementById("status-uptime");
  if (el) el.textContent = isConnected && connectTime ? formatDuration(Date.now() - connectTime) : "";
  const el2 = document.getElementById("conn-uptime");
  if (el2) el2.textContent = isConnected && connectTime ? formatDuration(Date.now() - connectTime) : "—";
}

function renderHome(): string {
  const profileName = profiles.find(p => p.key === settings.conn_key)?.name;
  const serverHost = getServerHost();
  const uptimeStr = isConnected && connectTime ? formatDuration(Date.now() - connectTime) : "";
  const dis = isConnecting;

  const powerBlock = `
    <div class="power-wrap">
      <button class="btn-power${isConnected ? " connected" : ""}${dis ? " connecting" : ""}" id="btn-connect"${dis ? " disabled" : ""}>${ICONS.power}</button>
    </div>
    <div class="power-status">
      <div class="status-text">${dis ? t("connecting") : isConnected ? t("connected") : t("disconnected")}</div>
      ${isConnected ? `<div class="status-server">${profileName ? esc(profileName) + " · " : ""}${serverHost ? esc(serverHost) + " · " : ""}<span id="status-uptime">${uptimeStr}</span></div>` : ""}
    </div>`;

  return `<div class="home-grid">
    ${powerBlock}

    <div class="section-header">
      <span class="section-title">${t("keysSection")}</span>
      <div class="key-menu-wrap">
        <button class="btn-icon-add" id="btn-add-key">${ICONS.plus}</button>
        <div class="key-menu" data-addmenu hidden style="min-width:210px">
          <button class="km-item" id="btn-add-key-single">${ICONS.user}<span>${t("addProfile")}</span></button>
          <button class="km-item" id="btn-add-key-sub">${ICONS.link}<span>${t("addSubscription")}</span></button>
          <button class="km-item" id="btn-add-key-paste">${ICONS.clipboard}<span>${t("pasteFromClipboard")}</span></button>
          ${isAndroid ? `<button class="km-item" id="btn-add-key-qr">${ICONS.qr}<span>${t("scanQr")}</span></button>` : ""}
          <button class="km-item" id="btn-add-key-import-json">${ICONS.code}<span>${t("pasteJson")}</span></button>
          <button class="km-item" id="btn-add-key-export-json">${ICONS.copy}<span>${t("copyJson")}</span></button>
          <button class="km-item" id="btn-refresh-all-subs">${ICONS.refresh}<span>${t("refreshAllSubs")}</span></button>
          <button class="km-item" id="btn-toggle-sub-auto">${ICONS.bolt}<span>${settings.sub_auto_update ? t("subAutoUpdateOn") : t("subAutoUpdateOff")}</span></button>
        </div>
      </div>
    </div>
    ${renderKeysList()}
  </div>`;
}

function bindHomeEvents(): void {
  document.getElementById("btn-connect")?.addEventListener("click", async () => {
    if (isConnecting) return;
    if (!isConnected && !settings.conn_key) {
      showToast(t("keyPlaceholder"), "error", 2500);
      return;
    }
    isConnected ? await doDisconnect() : await doConnect();
  });

}

function renderKeysList(): string {
  if (profiles.length === 0 && subscriptions.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">${ICONS.user}</div><p>${t("noKeys")}</p></div>`;
  }
  return renderProfileList() + renderSubList();
}

function renderProfileList(): string {
  return profiles.length === 0
    ? ""
    : profiles.map(p => {
        const isActive = isConnected && settings.conn_key === p.key;
        return `
        <div class="profile-card${isActive ? " key-active" : ""}">
          <div class="profile-info"><span>${ICONS.user}</span><span>${esc(p.name)}</span>${isActive ? `<span class="badge-on" style="font-size:10px;padding:1px 6px;flex-shrink:0">${t("active")}</span>` : ""}</div>
          <div class="profile-actions">
            <button class="btn-use-profile" data-id="${p.id}" title="${t("subSelectKey")}">${ICONS.play}</button>
            <div class="key-menu-wrap">
              <button class="btn-profile-menu" data-id="${p.id}" title="${t("more")}">${ICONS.kebab}</button>
              <div class="key-menu" data-profile="${p.id}" hidden>
                <button class="km-item btn-copy-profile" data-key="${esc(p.key)}">${ICONS.copy}<span>${t("copy")}</span></button>
                <button class="km-item km-danger btn-del-profile" data-id="${p.id}">${ICONS.x}<span>${t("subDelete")}</span></button>
              </div>
            </div>
          </div>
        </div>`;
      }).join("");
}

function renderSubList(): string {
  return subscriptions.length === 0
    ? ""
    : subscriptions.map(s => {
        const keyRows = s.keys.map((k, i) => {
          const pr = pingResults.get(`${s.id}:${i}`);
          const pingLabel = pr === "pinging" ? `<span class="ping-val pinging">${t("pingRunning")}</span>`
            : pr === "timeout" ? `<span class="ping-val timeout">${t("pingTimeout")}</span>`
            : pr !== undefined ? `<span class="ping-val ok">${pr}${t("pingMs")}</span>`
            : "";
          const keyIsActive = isConnected && settings.conn_key === k;
          return `
          <div class="sub-key-row${keyIsActive ? " key-active" : ""}">
            <span class="sub-key-val" title="${esc(k)}">${esc(k.length > 50 ? k.slice(0, 50) + "…" : k)}</span>
            ${keyIsActive ? `<span class="badge-on" style="font-size:10px;padding:1px 6px;flex-shrink:0">${t("active")}</span>` : ""}
            ${pingLabel}
            <button class="btn-use-sub-key" data-sub="${s.id}" data-idx="${i}" title="${t("subSelectKey")}">${ICONS.play}</button>
            <div class="key-menu-wrap">
              <button class="btn-key-menu" data-sub="${s.id}" data-idx="${i}" title="${t("more")}">${ICONS.kebab}</button>
              <div class="key-menu" data-sub="${s.id}" data-idx="${i}" hidden>
                <button class="km-item btn-ping-key" data-sub="${s.id}" data-idx="${i}" data-key="${esc(k)}">${ICONS.ping}<span>${t("pingKey")}</span></button>
                <button class="km-item btn-copy-key" data-key="${esc(k)}">${ICONS.copy}<span>${t("copy")}</span></button>
                <button class="km-item km-danger btn-del-key" data-sub="${s.id}" data-idx="${i}">${ICONS.x}<span>${t("subDelete")}</span></button>
              </div>
            </div>
          </div>`;
        }).join("");
        return `
          <div class="profile-card sub-card">
            <div class="profile-info sub-collapse-hdr" data-sub-id="${s.id}" style="cursor:pointer">
              <span class="sub-collapse-arrow" data-sub-id="${s.id}" style="opacity:.4;font-size:11px;flex-shrink:0">▶</span>
              <span>${ICONS.link}</span>
              <span class="sub-name" title="${esc(s.name || s.url)}">${esc(s.name || s.url)}</span>
            </div>
            <div class="profile-actions">
              <button class="btn-ping-all-sub" data-id="${s.id}" title="${t("pingAll")}">${ICONS.ping}</button>
              <button class="btn-rename-sub" data-id="${s.id}" title="${t("subRename")}">${ICONS.pencil}</button>
              <button class="btn-refresh-sub" data-id="${s.id}" title="${t("subRefresh")}">${subUpdateAvailable.has(s.id) ? '<span class="sub-update-dot"></span>' : ""}${ICONS.refresh}</button>
              <button class="btn-del-sub" data-id="${s.id}" title="${t("subDelete")}">${ICONS.x}</button>
            </div>
            ${s.keys.length > 0 ? `<div class="sub-keys" data-sub-id="${s.id}" style="display:none">${keyRows}</div>` : ""}
          </div>`;
      }).join("");
}

function bindProfileEvents(): void {
  document.getElementById("btn-add-key")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = document.querySelector<HTMLElement>(".key-menu[data-addmenu]");
    const isOpen = menu ? !menu.hidden : false;
    document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
    if (menu) menu.hidden = isOpen;
  });
  document.getElementById("btn-add-key-single")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
    showProfileModal();
  });
  document.getElementById("btn-add-key-sub")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
    showSubModal();
  });
  document.getElementById("btn-add-key-paste")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
    try {
      const text = await clipboardRead();
      if (!text) { showToast(t("clipboardEmpty"), "error", 2500); return; }
      handlePastedOrScannedText(text);
    } catch {
      showToast(t("clipboardReadFailed"), "error", 2500);
    }
  });
  document.getElementById("btn-add-key-qr")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
    try {
      const result = await qrScan({ windowed: true, formats: [QrFormat.QRCode] });
      handlePastedOrScannedText(result.content);
    } catch {
      showToast(t("qrScanFailed"), "error", 2500);
    }
  });
  document.getElementById("btn-add-key-import-json")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
    showImportJsonModal();
  });
  document.getElementById("btn-add-key-export-json")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
    try {
      await clipboardWrite(JSON.stringify({ profiles, subscriptions }));
      showToast(t("jsonCopied"), "success", 3000);
      osNotify(t("jsonCopied"), `${profiles.length + subscriptions.length}`);
    } catch {
      showToast(t("clipboardWriteFailed"), "error", 2500);
    }
  });
  document.getElementById("btn-refresh-all-subs")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
    const total = subscriptions.length;
    if (total === 0) { showToast(t("noSubscriptions"), "error", 2000); return; }
    const results = await Promise.all(subscriptions.map(s =>
      invoke<Subscription>("refresh_subscription", { id: s.id }).catch(() => null)
    ));
    let ok = 0;
    results.forEach((updated, i) => {
      if (updated) { subscriptions[i] = updated; ok++; }
    });
    showToast(`${t("subsRefreshedSummary")} ${ok}/${total}`, ok === total ? "success" : "info", 3000);
    if (ok > 0) osNotify(t("subUpdated"), `${t("subsRefreshedSummary")} ${ok}/${total}`);
    renderPage();
  });
  document.getElementById("btn-toggle-sub-auto")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
    settings.sub_auto_update = !settings.sub_auto_update;
    persistSettings();
    if (settings.sub_auto_update) startSubAutoCheck(); else stopSubAutoCheck();
    renderPage();
  });

  document.querySelectorAll<HTMLElement>(".btn-use-profile").forEach(el => {
    el.addEventListener("click", () => {
      const p = profiles.find(x => x.id === el.dataset.id);
      if (p) switchToKey(p.key);
    });
  });
  document.querySelectorAll<HTMLElement>(".btn-profile-menu").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = el.dataset.id!;
      const menu = document.querySelector<HTMLElement>(`.key-menu[data-profile="${id}"]`);
      const isOpen = menu ? !menu.hidden : false;
      document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
      if (menu) menu.hidden = isOpen;
    });
  });
  document.querySelectorAll<HTMLElement>(".btn-copy-profile").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      clipboardWrite(el.dataset.key ?? "");
      document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
      showToast(t("copied"), "success", 1500);
    });
  });
  document.querySelectorAll<HTMLElement>(".btn-del-profile").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      profiles = profiles.filter(x => x.id !== el.dataset.id); saveProfiles(); renderPage();
    });
  });

  document.querySelectorAll<HTMLElement>(".sub-collapse-hdr").forEach(hdr => {
    hdr.addEventListener("click", () => {
      const id = hdr.dataset.subId!;
      const body = document.querySelector<HTMLElement>(`.sub-keys[data-sub-id="${id}"]`);
      const arrow = document.querySelector<HTMLElement>(`.sub-collapse-arrow[data-sub-id="${id}"]`);
      if (!body) return;
      const open = body.style.display !== "none";
      body.style.display = open ? "none" : "block";
      if (arrow) arrow.textContent = open ? "▶" : "▼";
    });
  });

  document.querySelectorAll<HTMLElement>(".btn-key-menu").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const subId = el.dataset.sub!;
      const idx = el.dataset.idx!;
      const menu = document.querySelector<HTMLElement>(`.key-menu[data-sub="${subId}"][data-idx="${idx}"]`);
      const isOpen = menu ? !menu.hidden : false;
      document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
      if (menu) menu.hidden = isOpen;
    });
  });
  document.querySelectorAll<HTMLElement>(".btn-copy-key").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      clipboardWrite(el.dataset.key ?? "");
      document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
      showToast(t("copied"), "success", 1500);
    });
  });
  document.querySelectorAll<HTMLElement>(".btn-del-key").forEach(el => {
    el.addEventListener("click", async (e) => {
      e.stopPropagation();
      const subId = el.dataset.sub!;
      const idx = parseInt(el.dataset.idx ?? "0", 10);
      try {
        const updated = await invoke<Subscription>("delete_sub_key", { id: subId, index: idx });
        subscriptions = subscriptions.map(s => s.id === subId ? updated : s);
      } catch (err) {
        showToast(String(err), "error", 3000);
      }
      renderPage();
    });
  });

  document.querySelectorAll<HTMLElement>(".btn-ping-key").forEach(el => {
    el.addEventListener("click", async (e) => {
      e.stopPropagation();
      const subId = el.dataset.sub!;
      const idx = parseInt(el.dataset.idx ?? "0", 10);
      const key = el.dataset.key!;
      const mapKey = `${subId}:${idx}`;
      document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
      pingResults.set(mapKey, "pinging");
      renderPage();
      try {
        const ms = await invoke<number>("ping_key", { key });
        pingResults.set(mapKey, ms);
      } catch {
        pingResults.set(mapKey, "timeout");
      }
      renderPage();
    });
  });

  document.querySelectorAll<HTMLElement>(".btn-ping-all-sub").forEach(el => {
    el.addEventListener("click", async () => {
      const subId = el.dataset.id!;
      const sub = subscriptions.find(s => s.id === subId);
      if (!sub) return;
      sub.keys.forEach((_, i) => pingResults.set(`${subId}:${i}`, "pinging"));
      renderPage();
      await Promise.all(sub.keys.map(async (k, i) => {
        try {
          const ms = await invoke<number>("ping_key", { key: k });
          pingResults.set(`${subId}:${i}`, ms);
        } catch {
          pingResults.set(`${subId}:${i}`, "timeout");
        }
      }));
      renderPage();
    });
  });

  document.querySelectorAll<HTMLElement>(".btn-rename-sub").forEach(el => {
    el.addEventListener("click", () => {
      const subId = el.dataset.id!;
      const sub = subscriptions.find(s => s.id === subId);
      if (!sub) return;
      const newName = prompt(t("subName"), sub.name || sub.url);
      if (newName === null) return;
      invoke("rename_subscription", { id: subId, name: newName.trim() }).then(() => {
        sub.name = newName.trim();
        renderPage();
      }).catch((e: unknown) => showToast(String(e), "error", 4000));
    });
  });

  document.querySelectorAll<HTMLElement>(".btn-refresh-sub").forEach(el => {
    el.addEventListener("click", async () => {
      const id = el.dataset.id!;
      (el as HTMLButtonElement).disabled = true;
      el.classList.add("spinning");
      try {
        const updated = await invoke<Subscription>("refresh_subscription", { id });
        subscriptions = subscriptions.map(s => s.id === id ? updated : s);
        subUpdateAvailable.delete(id);
        showToast(t("subUpdated"), "success");
        osNotify(t("subUpdated"), updated.name || updated.url);
      } catch { showToast(t("subUpdateFailed"), "error"); }
      renderPage();
    });
  });
  document.querySelectorAll<HTMLElement>(".btn-del-sub").forEach(el => {
    el.addEventListener("click", async () => {
      const id = el.dataset.id!;
      try {
        await invoke("delete_subscription", { id });
        subscriptions = subscriptions.filter(s => s.id !== id);
        renderPage();
      } catch (e) {
        showToast(String(e), "error", 4000);
      }
    });
  });
  document.querySelectorAll<HTMLElement>(".btn-use-sub-key").forEach(el => {
    el.addEventListener("click", () => {
      const sub = subscriptions.find(s => s.id === el.dataset.sub);
      const idx = parseInt(el.dataset.idx ?? "0", 10);
      if (sub && sub.keys[idx]) switchToKey(sub.keys[idx]);
    });
  });
}

function showSubModal(prefillUrl?: string): void {
  const ov = document.createElement("div");
  ov.className = "modal-overlay";
  ov.innerHTML = `
    <div class="modal">
      <h3>${t("addSubscription")}</h3>
      <div class="modal-field">
        <label>${t("subName")}</label>
        <input id="sub-modal-name" placeholder="${t("subName")}" />
      </div>
      <div class="modal-field">
        <label>${t("subUrl")}</label>
        <input id="sub-modal-url" placeholder="${t("subUrlHint")}" value="${prefillUrl ? esc(prefillUrl) : ""}" />
      </div>
      <div id="sub-modal-err" style="color:var(--danger,#e55);font-size:12px;margin-top:4px;word-break:break-all;overflow-wrap:anywhere;display:none"></div>
      <div class="modal-actions">
        <button class="btn-cancel" id="sub-modal-cancel">${t("cancel")}</button>
        <button class="btn-save" id="sub-modal-save">${t("save")}</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById("sub-modal-cancel")?.addEventListener("click", () => ov.remove());
  document.getElementById("sub-modal-save")?.addEventListener("click", async () => {
    const name = (document.getElementById("sub-modal-name") as HTMLInputElement).value.trim();
    const url = (document.getElementById("sub-modal-url") as HTMLInputElement).value.trim();
    const errEl = document.getElementById("sub-modal-err")!;
    if (!url) { errEl.textContent = t("subUrlHint"); errEl.style.display = ""; return; }
    const btn = document.getElementById("sub-modal-save") as HTMLButtonElement;
    btn.disabled = true; btn.textContent = t("subRefreshing");
    try {
      const entry = await invoke<Subscription>("add_subscription", { name, url });
      subscriptions.push(entry);
      ov.remove();
      showToast(t("subAdded"), "success", 3000);
      if (currentPage === "home") renderPage();
    } catch (e) {
      errEl.textContent = String(e);
      errEl.style.display = "";
      btn.disabled = false; btn.textContent = t("save");
    }
  });
}

function showImportJsonModal(): void {
  const ov = document.createElement("div");
  ov.className = "modal-overlay";
  ov.innerHTML = `
    <div class="modal">
      <h3>${t("pasteJson")}</h3>
      <div class="modal-field">
        <label>${t("jsonData")}</label>
        <textarea id="import-json-text" rows="8" placeholder='{"profiles":[...],"subscriptions":[...]}'></textarea>
      </div>
      <div id="import-json-err" style="color:var(--danger,#e55);font-size:12px;margin-top:4px;word-break:break-all;overflow-wrap:anywhere;display:none"></div>
      <div class="modal-actions">
        <button class="btn-cancel" id="import-json-cancel">${t("cancel")}</button>
        <button class="btn-save" id="import-json-save">${t("save")}</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById("import-json-cancel")?.addEventListener("click", () => ov.remove());
  document.getElementById("import-json-save")?.addEventListener("click", async () => {
    const raw = (document.getElementById("import-json-text") as HTMLTextAreaElement).value.trim();
    const errEl = document.getElementById("import-json-err")!;
    let parsed: { profiles?: Profile[]; subscriptions?: Subscription[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      errEl.textContent = t("jsonParseError");
      errEl.style.display = "";
      return;
    }
    const btn = document.getElementById("import-json-save") as HTMLButtonElement;
    btn.disabled = true; btn.textContent = t("subRefreshing");
    try {
      let importedProfiles = 0;
      let importedSubs = 0;
      if (Array.isArray(parsed.profiles)) {
        parsed.profiles.forEach((p, i) => {
          if (p?.name && p?.key) {
            profiles.push({ id: (Date.now() + i).toString(), name: p.name, key: p.key });
            importedProfiles++;
          }
        });
        if (importedProfiles > 0) saveProfiles();
      }
      if (Array.isArray(parsed.subscriptions) && parsed.subscriptions.length > 0) {
        const imported = await invoke<Subscription[]>("import_subscriptions", { entries: parsed.subscriptions });
        subscriptions.push(...imported);
        importedSubs = imported.length;
      }
      ov.remove();
      showToast(`${t("jsonImported")} ${importedProfiles + importedSubs}`, "success", 3000);
      osNotify(t("jsonImported"), `${importedProfiles + importedSubs}`);
      if (currentPage === "home") renderPage();
    } catch (e) {
      errEl.textContent = String(e);
      errEl.style.display = "";
      btn.disabled = false; btn.textContent = t("save");
    }
  });
}

const DISCORD_RULE_ID = "discord-builtin";
const DISCORD_UPDATE_RULE_ID = "discord-update-builtin";
const DISCORD_PROCESS_VALUE = isAndroid ? "com.discord" : "Discord.exe";

function getDiscordRule(): RoutingRule | undefined {
  return routingRules.find(r =>
    r.id === DISCORD_RULE_ID ||
    (r.kind === "process" && r.value.toLowerCase() === DISCORD_PROCESS_VALUE.toLowerCase())
  );
}

async function setDiscordMode(action: "PROXY" | "DIRECT"): Promise<void> {
  const main = getDiscordRule();
  if (main) {
    main.action = action;
    main.value = DISCORD_PROCESS_VALUE;
  } else {
    routingRules.push({ id: DISCORD_RULE_ID, kind: "process", value: DISCORD_PROCESS_VALUE, action });
  }
  if (!isAndroid) {
    const upd = routingRules.find(r => r.id === DISCORD_UPDATE_RULE_ID ||
      (r.kind === "process" && r.value.toLowerCase() === "update.exe"));
    if (upd) {
      upd.action = action;
    } else {
      routingRules.push({ id: DISCORD_UPDATE_RULE_ID, kind: "process", value: "Update.exe", action });
    }
  }
  await persistRoutingRules();
  if (isAndroid) showToast(t("reconnectRequired"), "info", 3500);
}

function renderRouting(): string {
  const discordRule = getDiscordRule();
  const discordAction = discordRule?.action ?? "PROXY";
  const discordIds = new Set([DISCORD_RULE_ID, DISCORD_UPDATE_RULE_ID]);
  const discordProcs = new Set(isAndroid ? ["com.discord"] : ["discord.exe", "update.exe"]);

  // Unified rules list: routing + blocklist together
  const allRules: Array<{ r: RoutingRule; src: "routing" | "block" }> = [
    ...routingRules
      .filter(r => !discordIds.has(r.id) && !(r.kind === "process" && discordProcs.has(r.value.toLowerCase())))
      .map(r => ({ r, src: "routing" as const })),
    ...blocklistRules.map(r => ({ r, src: "block" as const })),
  ];

  const actionBadge = (r: RoutingRule) => {
    if (r.action === "REJECT") return `<span class="rule-action-badge reject">${t("ruleBlock")}</span>`;
    if (r.action === "PROXY")  return `<span class="rule-action-badge proxy">${t("ruleViaVpn")}</span>`;
    return `<span class="rule-action-badge direct">${t("ruleDirect")}</span>`;
  };
  const kindLabel = (r: RoutingRule) =>
    r.kind === "domain" ? t("ruleSite")
    : r.kind === "domain-keyword" ? t("ruleKeyword")
    : r.kind === "ip" ? "IP"
    : t("ruleApp");

  const unifiedRows = allRules.length === 0
    ? `<div class="empty-state"><p>${t("ruleNoRules")}</p></div>`
    : allRules.map(({ r, src }) => `
        <div class="rule-row" data-id="${r.id}" data-src="${src}">
          <span class="rule-kind">${kindLabel(r)}</span>
          <span class="rule-value" title="${esc(r.value)}">${esc(r.kind === "process" ? r.value.split(/[\\/]/).pop() || r.value : r.value)}</span>
          ${actionBadge(r)}
          <button class="btn-del-rule" data-id="${r.id}" data-src="${src}">${ICONS.x}</button>
        </div>`).join("");

  const discordIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.025.016.048.036.063a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>`;

  return `
    <div class="page-header">
      <h2 class="page-title">${t("routingTitle")}</h2>
    </div>

    <div class="card" style="margin-bottom:10px">
      <div class="card-header" style="padding-bottom:8px">
        <span class="card-title" style="display:flex;align-items:center;gap:6px;color:#5865F2">${discordIcon} Discord</span>
        <div class="pill-group" id="discord-mode-pills">
          <button class="pill-btn${discordAction === "PROXY" ? " active" : ""}" data-act="PROXY">${t("ruleViaVpn")}</button>
          <button class="pill-btn${discordAction === "DIRECT" ? " active" : ""}" data-act="DIRECT">${t("ruleDirect2")}</button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:10px">
      <div class="card-header" style="padding-bottom:6px">
        <span class="card-title">${t("ruleAdd")}</span>
      </div>

      <div class="rule-type-bar" id="rule-type-bar">
        <button class="rule-type-btn active" data-type="domain">${t("ruleSiteType")}</button>
        <button class="rule-type-btn" data-type="process">${t("ruleAppType")}</button>
        <button class="rule-type-btn" data-type="domain-keyword">${t("ruleKeywordType")}</button>
        <button class="rule-type-btn" data-type="ip">IP</button>
      </div>

      <div class="rule-add-row" style="margin-top:8px">
        <div id="rule-input-wrap" style="flex:1;display:flex;align-items:center;gap:6px;min-width:0">
          <input type="text" id="rule-value-input" placeholder="${t("rulePlaceholder")}" class="rule-input" style="flex:1"/>
        </div>
        <div class="pill-group" id="rule-action-pills">
          <button class="pill-btn active" data-act="DIRECT">${t("ruleDirect2")}</button>
          <button class="pill-btn" data-act="PROXY">${t("ruleViaVpn")}</button>
          <button class="pill-btn" data-act="REJECT" style="color:var(--danger,#e74c3c)">${t("ruleBlock")}</button>
        </div>
        <button class="btn-sm" id="btn-add-rule">+</button>
      </div>

      <div id="rule-app-row" style="display:none;margin-top:6px;display:none">
        <div class="rule-add-row" style="margin:0">
          ${isAndroid ? "" : `<label class="btn-sm" style="cursor:pointer">
            ${t("rulesBrowseExe")}
            <input type="file" id="rule-exe-input" accept=".exe" style="display:none"/>
          </label>`}
          <button class="btn-sm" id="btn-pick-process">${isAndroid ? t("rulesPickApp") : t("rulesRunning")}</button>
          <span class="rule-exe-display" id="rule-exe-display">—</span>
        </div>
      </div>
    </div>

    <div id="process-picker-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:900;align-items:center;justify-content:center">
      <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;width:340px;max-height:520px;display:flex;flex-direction:column;padding:0;overflow:hidden">
        <div style="padding:12px 14px 8px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
          <input id="process-search" type="text" placeholder="${isAndroid ? t("rulesSearchApp") : t("rulesSearchProcess")}" class="input-inline" style="flex:1"/>
          <button id="btn-process-close" class="btn-sm" style="padding:4px 8px">✕</button>
        </div>
        <div id="process-list-inner" style="overflow-y:auto;flex:1;padding:4px 0"></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:10px">
      <div class="card-header" style="padding-bottom:4px">
        <span class="card-title">${t("rulesTitle")} <span style="opacity:.4;font-weight:400;font-size:12px">${allRules.length}</span></span>
      </div>
      <div id="rules-list">${unifiedRows}</div>
    </div>

    <div class="card" id="mb-card">
      <div class="card-header" style="cursor:pointer" id="mb-collapse-hdr">
        <span class="card-title">${t("multibridgeTitle")}</span>
        <span style="opacity:.4;font-size:12px" id="mb-collapse-arrow">▼</span>
      </div>
      <div id="mb-collapse-body" style="display:none;padding-top:8px">
        <p style="font-size:12px;opacity:.55;margin:0 0 8px">${t("multibridgeDesc")}</p>
        <div class="rule-add-row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">
          <input type="text" id="mb-addr-input" placeholder="host:port" class="rule-input" style="flex:1;min-width:120px"/>
          <input type="text" id="mb-rules-input" placeholder="${t("multibridgeDomains")}" class="rule-input" style="flex:2;min-width:160px"/>
          <button class="btn-sm" id="btn-add-mb">+</button>
        </div>
        <div id="mb-bridge-list">
          ${multiBridges.length === 0
            ? `<div class="empty-state" style="padding:8px 0"><p style="font-size:12px;opacity:.4">${t("multibridgeNone")}</p></div>`
            : multiBridges.map(b => `
              <div class="rule-row" data-mb-id="${b.id}">
                <span class="rule-kind" style="background:var(--accent-subtle,#1e3a5f);color:var(--accent)">${b.address}</span>
                <span class="rule-value" style="flex:1;font-size:11px;opacity:.7">${b.rules.join(", ") || t("multibridgeAllTraffic")}</span>
                <button class="btn-del-rule btn-del-mb" data-mb-id="${b.id}">${ICONS.x}</button>
              </div>`).join("")}
        </div>
      </div>
    </div>
    </div>`;
}

let _selectedExe = "";

function bindRoutingEvents(): void {
  // Discord mode pills
  document.querySelectorAll<HTMLElement>("#discord-mode-pills .pill-btn").forEach(el => {
    el.addEventListener("click", async () => {
      const action = el.dataset.act as "PROXY" | "DIRECT";
      document.querySelectorAll("#discord-mode-pills .pill-btn").forEach(b => b.classList.remove("active"));
      el.classList.add("active");
      await setDiscordMode(action);
    });
  });

  // Rule type bar
  let _ruleType = "domain";
  document.querySelectorAll<HTMLElement>("#rule-type-bar .rule-type-btn").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll("#rule-type-bar .rule-type-btn").forEach(b => b.classList.remove("active"));
      el.classList.add("active");
      _ruleType = el.dataset.type || "domain";
      const inputWrap = document.getElementById("rule-input-wrap");
      const appRow = document.getElementById("rule-app-row");
      const valInput = document.getElementById("rule-value-input") as HTMLInputElement;
      if (_ruleType === "process") {
        if (inputWrap) inputWrap.style.display = "none";
        if (appRow) appRow.style.display = "block";
      } else {
        if (inputWrap) inputWrap.style.display = "flex";
        if (appRow) appRow.style.display = "none";
        if (valInput) valInput.placeholder = _ruleType === "ip"
          ? "e.g. 1.2.3.4/24"
          : _ruleType === "domain-keyword"
            ? t("ruleKeywordPlaceholder")
            : t("rulePlaceholder");
      }
    });
  });

  // Action pills
  document.querySelectorAll<HTMLElement>("#rule-action-pills .pill-btn").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll("#rule-action-pills .pill-btn").forEach(b => b.classList.remove("active"));
      el.classList.add("active");
    });
  });

  // File browse for process
  document.getElementById("rule-exe-input")?.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      _selectedExe = file.name;
      const display = document.getElementById("rule-exe-display");
      if (display) display.textContent = file.name;
    }
  });

  // Process picker button
  document.getElementById("btn-pick-process")?.addEventListener("click", async () => {
    const overlay = document.getElementById("process-picker-overlay") as HTMLElement;
    const inner = document.getElementById("process-list-inner") as HTMLElement;
    if (!overlay || !inner) return;
    inner.innerHTML = `<div style="padding:16px;text-align:center;opacity:.5">${t("loading")}</div>`;
    overlay.style.display = "flex";
    try {
      const procs: { name: string; label: string; pid: number }[] = await invoke("list_processes");
      renderProcessList(procs, inner, "");
      const search = document.getElementById("process-search") as HTMLInputElement;
      if (search) {
        search.value = "";
        search.oninput = () => renderProcessList(procs, inner, search.value);
        // На Android автофокус на input открывает клавиатуру и перекрывает список
        if (!isAndroid) setTimeout(() => search.focus(), 50);
      }
    } catch (e) {
      inner.innerHTML = `<div style="padding:16px;color:var(--danger)">${esc(String(e))}</div>`;
    }
  });

  document.getElementById("btn-process-close")?.addEventListener("click", () => {
    (document.getElementById("process-picker-overlay") as HTMLElement).style.display = "none";
  });

  document.getElementById("process-picker-overlay")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) (e.currentTarget as HTMLElement).style.display = "none";
  });

  // Add rule
  document.getElementById("btn-add-rule")?.addEventListener("click", async () => {
    const action = ((document.querySelector("#rule-action-pills .pill-btn.active") as HTMLElement)?.dataset.act || "DIRECT") as "DIRECT" | "PROXY" | "REJECT";
    const currentType = (document.querySelector("#rule-type-bar .rule-type-btn.active") as HTMLElement)?.dataset.type || "domain";
    let value = "";
    if (currentType === "process") {
      value = _selectedExe;
    } else {
      const inp = document.getElementById("rule-value-input") as HTMLInputElement;
      value = inp?.value.trim() || "";
      if (currentType === "domain") value = value.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    }
    if (!value) return;

    const rule: RoutingRule = { id: Date.now().toString(), kind: currentType as RoutingRule["kind"], value, action };
    if (action === "REJECT") {
      blocklistRules.push(rule);
      await persistBlocklist();
    } else {
      routingRules.push(rule);
      await persistRoutingRules();
    }
    _selectedExe = "";
    const inp = document.getElementById("rule-value-input") as HTMLInputElement;
    if (inp) inp.value = "";
    if (isAndroid) showToast(t("reconnectRequired"), "info", 3500);
    renderPage();
  });

  // Delete rule (unified list)
  document.querySelectorAll<HTMLElement>(".btn-del-rule").forEach(el => {
    el.addEventListener("click", async () => {
      const id = el.dataset.id;
      const src = el.dataset.src;
      if (src === "block") {
        blocklistRules = blocklistRules.filter(r => r.id !== id);
        await persistBlocklist();
      } else {
        routingRules = routingRules.filter(r => r.id !== id);
        await persistRoutingRules();
      }
      if (isAndroid) showToast(t("reconnectRequired"), "info", 3500);
      renderPage();
    });
  });

  // Multi-bridge collapse toggle
  document.getElementById("mb-collapse-hdr")?.addEventListener("click", () => {
    const body = document.getElementById("mb-collapse-body");
    const arrow = document.getElementById("mb-collapse-arrow");
    if (!body) return;
    const open = body.style.display !== "none";
    body.style.display = open ? "none" : "block";
    if (arrow) arrow.textContent = open ? "▶" : "▼";
  });

  // Multi-bridge: add
  document.getElementById("btn-add-mb")?.addEventListener("click", async () => {
    const addrInput = document.getElementById("mb-addr-input") as HTMLInputElement;
    const rulesInput = document.getElementById("mb-rules-input") as HTMLInputElement;
    const addr = addrInput.value.trim();
    if (!addr) return;
    const rules = rulesInput.value.split(",").map(r => r.trim()).filter(Boolean);
    const entry: MultiBridgeEntry = { id: Date.now().toString(), address: addr, rules };
    multiBridges.push(entry);
    await persistMultiBridges();
    try {
      await fetch(`http://127.0.0.1:10801/multi-bridges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, address: addr, rules }),
      });
    } catch { /**/ }
    addrInput.value = "";
    rulesInput.value = "";
    renderPage();
  });

  // Multi-bridge: delete
  document.querySelectorAll<HTMLElement>(".btn-del-mb").forEach(el => {
    el.addEventListener("click", async () => {
      const id = el.dataset.mbId;
      multiBridges = multiBridges.filter(b => b.id !== id);
      await persistMultiBridges();
      try {
        await fetch(`http://127.0.0.1:10801/multi-bridges/${id}`, { method: "DELETE" });
      } catch { /**/ }
      renderPage();
    });
  });
}

function renderProcessList(procs: { name: string; label: string; pid: number }[], container: HTMLElement, filter: string): void {
  const q = filter.toLowerCase();
  const filtered = q
    ? procs.filter(p => (p.label || p.name).toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
    : procs;

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding:12px;text-align:center;opacity:.5">${t("rulesNoProcesses")}</div>`;
    return;
  }

  const showSub = filtered.some(p => p.label && p.label !== p.name);
  container.innerHTML = filtered.slice(0, 300).map(p => {
    const displayName = p.label || p.name;
    const sub = showSub && p.label !== p.name ? p.name : (p.pid > 0 ? `PID ${p.pid}` : "");
    return `<div class="process-pick-row" data-name="${esc(p.name)}" data-label="${esc(displayName)}"
      style="padding:${showSub ? "9px" : "7px"} 14px;cursor:pointer;display:flex;flex-direction:${showSub ? "column" : "row"};align-items:${showSub ? "flex-start" : "center"};gap:${showSub ? "2px" : "10px"};border-bottom:1px solid var(--border)">
      <span style="font-size:13px;${showSub ? "font-weight:500" : "flex:1"}">${esc(displayName)}</span>
      ${sub ? `<span style="font-size:11px;opacity:.45">${esc(sub)}</span>` : ""}
    </div>`;
  }).join("");

  container.querySelectorAll<HTMLElement>(".process-pick-row").forEach(row => {
    row.onmouseenter = () => row.style.background = "var(--hover-bg, rgba(255,255,255,.06))";
    row.onmouseleave = () => row.style.background = "";
    row.addEventListener("click", () => {
      const name = row.dataset.name || "";
      const label = row.dataset.label || name;
      _selectedExe = name;
      const display = document.getElementById("rule-exe-display");
      if (display) display.textContent = label;
      const overlay = document.getElementById("process-picker-overlay") as HTMLElement;
      if (overlay) overlay.style.display = "none";
    });
  });
}

let _logPollTimer: ReturnType<typeof setInterval> | null = null;

function startLogPolling(): void {
  if (_logPollTimer !== null || !isAndroid) return;
  _logPollTimer = setInterval(async () => {
    try {
      const lines = await invoke<string[]>("get_vpn_log");
      lines.forEach(l => addLog(l));
    } catch { /* ignore */ }
  }, 2000);
}

function stopLogPolling(): void {
  if (_logPollTimer !== null) {
    clearInterval(_logPollTimer);
    _logPollTimer = null;
  }
}

let logFilter = "all";
let logSearch = "";

function renderLogs(): string {
  const filtered = logLines.filter(line => {
    if (logFilter !== "all" && logLineLevel(line) !== logFilter) return false;
    if (logSearch && !line.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });
  const colorized = filtered.map(line => {
    const lvl = logLineLevel(line);
    const cls = "log-line" + (lvl ? ` log-${lvl}` : "");
    return `<div class="${cls}">${esc(line)}</div>`;
  }).join("");
  const txt = colorized || `<div class="log-line log-info">${t("logReady")}</div>`;
  return `
    <div class="page-header">
      <h2 class="page-title">${t("systemLog")}</h2>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="log-status">${isConnected ? t("connected") : t("disconnected")}</span>
        <button class="btn-sm" id="btn-clear-logs">${t("clearLogs")}</button>
      </div>
    </div>
    <div class="log-toolbar">
      <input type="text" class="log-search" id="log-search" placeholder="${t("logSearchPlaceholder")}" value="${esc(logSearch)}"/>
      <div class="pill-group">
        <button class="pill-btn log-filter-btn ${logFilter === "all" ? "active" : ""}" data-filter="all">${t("logAll")}</button>
        <button class="pill-btn log-filter-btn ${logFilter === "error" ? "active" : ""}" data-filter="error">Error</button>
        <button class="pill-btn log-filter-btn ${logFilter === "warn" ? "active" : ""}" data-filter="warn">Warn</button>
        <button class="pill-btn log-filter-btn ${logFilter === "info" ? "active" : ""}" data-filter="info">Info</button>
      </div>
      <span class="log-count">${filtered.length}/${logLines.length}</span>
    </div>
    <div class="log-box" id="log-box">${txt}</div>`;
}

function bindLogEvents(): void {
  document.getElementById("log-search")?.addEventListener("input", function () {
    logSearch = (this as HTMLInputElement).value;
    _refreshLogBox();
  });
  document.querySelectorAll<HTMLElement>(".log-filter-btn").forEach(btn => btn.addEventListener("click", () => {
    logFilter = btn.dataset.filter || "all";
    document.querySelectorAll<HTMLElement>(".log-filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === logFilter));
    _refreshLogBox();
  }));
}

function getFPDescription(fp: string): string {
  const descs: Record<string, Record<Lang, string>> = {
    chrome:     { ru: "Chrome — самый распространённый, рекомендуется", en: "Chrome — most common, recommended",       zh: "Chrome — 最常用，推荐",              fa: "Chrome — رایج‌ترین، توصیه می‌شود" },
    chrome_120: { ru: "Chrome 120 — конкретная версия",                 en: "Chrome 120 — specific version",           zh: "Chrome 120 — 指定版本",              fa: "Chrome 120 — نسخه مشخص" },
    chrome_115: { ru: "Chrome 115 — конкретная версия",                 en: "Chrome 115 — specific version",           zh: "Chrome 115 — 指定版本",              fa: "Chrome 115 — نسخه مشخص" },
    firefox:    { ru: "Firefox — второй по популярности",               en: "Firefox — second most popular",           zh: "Firefox — 第二受欢迎",              fa: "Firefox — دومین مرورگر محبوب" },
    firefox_120:{ ru: "Firefox 120 — конкретная версия",                en: "Firefox 120 — specific version",          zh: "Firefox 120 — 指定版本",            fa: "Firefox 120 — نسخه مشخص" },
    safari:     { ru: "Safari — macOS/iOS браузер Apple",               en: "Safari — Apple macOS/iOS browser",        zh: "Safari — Apple macOS/iOS浏览器",    fa: "Safari — مرورگر Apple macOS/iOS" },
    ios:        { ru: "iOS Safari — мобильный фингерпринт",             en: "iOS Safari — mobile fingerprint",         zh: "iOS Safari — 移动设备指纹",          fa: "iOS Safari — اثر انگشت موبایل" },
    android:    { ru: "Android OkHttp — мобильный клиент",              en: "Android OkHttp — mobile client",          zh: "Android OkHttp — 移动客户端",        fa: "Android OkHttp — کلاینت موبایل" },
    edge:       { ru: "Microsoft Edge — на базе Chromium",              en: "Microsoft Edge — Chromium-based",         zh: "Microsoft Edge — 基于Chromium",     fa: "Microsoft Edge — مبتنی بر Chromium" },
    random:     { ru: "Случайный фингерпринт каждое подключение",       en: "Random fingerprint per connection",       zh: "每次连接随机指纹",                    fa: "اثر انگشت تصادفی برای هر اتصال" },
  };
  return descs[fp]?.[lang] ?? "";
}

function renderSettings(): string {
  const vpnDnsVal = settings.vpn_dns || "1.1.1.1";
  const vpnDnsPills = [
    ["1.1.1.1", "1.1.1.1"],
    ["8.8.8.8", "8.8.8.8"],
    ["77.88.8.8", "Yandex"],
    ["system", t("isp")],
  ].map(([v, l]) =>
    `<button class="pill-btn${vpnDnsVal === v || (v === "1.1.1.1" && !settings.vpn_dns) ? " active" : ""}" data-vpndns="${v}">${l}</button>`
  ).join("");

  if (isAndroid) {
    return `<div class="page-header"><h2 class="page-title">${t("settings")}</h2></div>
    <div class="settings-section">
      <div class="settings-section-title">sing-box</div>
      <div class="setting-row"><span class="setting-label">${t("vpnDns")}</span><div class="setting-value" style="flex-direction:column;align-items:stretch;gap:6px">
        <div class="pill-group" style="flex-wrap:wrap;gap:4px">${vpnDnsPills}</div>
        <input type="text" id="set-vpn-dns" value="${esc(vpnDnsVal)}" placeholder="1.1.1.1" style="width:100%;box-sizing:border-box;text-align:left"/>
        <span style="font-size:11px;opacity:.5">${t("vpnDnsHint")}</span>
      </div></div>
      <div class="setting-row"><span class="setting-label">${t("dnsMode")}</span><div class="setting-value"><div class="pill-group">
        <button class="pill-btn ${!settings.dns_mode || settings.dns_mode === "udp" ? "active" : ""}" data-dnsmode="udp">UDP</button>
        <button class="pill-btn ${settings.dns_mode === "tcp" ? "active" : ""}" data-dnsmode="tcp">TCP</button>
        <button class="pill-btn ${settings.dns_mode === "doh" ? "active" : ""}" data-dnsmode="doh">DoH</button>
      </div></div></div>
      <div class="setting-row" style="align-items:center">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">
          <span class="setting-label">${t("dnsStrategy")}</span>
          <span style="font-size:11px;opacity:.5;font-weight:400">${t("dnsStrategyHint")}</span>
        </div>
        <div class="setting-value"><div class="pill-group">
          <button class="pill-btn ${!settings.dns_strategy || settings.dns_strategy === "fakeip" ? "active" : ""}" data-dnsstrategy="fakeip">${t("dnsFakeip")}</button>
          <button class="pill-btn ${settings.dns_strategy === "local" ? "active" : ""}" data-dnsstrategy="local">${t("dnsLocal")}</button>
        </div></div>
      </div>
      <div class="setting-row" style="align-items:center">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">
          <span class="setting-label">${t("mtuLabel")}</span>
          <span style="font-size:11px;opacity:.5;font-weight:400">${t("mtuHint")}</span>
        </div>
        <div class="setting-value"><input type="number" id="set-mtu" min="576" max="9000" value="${settings.mtu ?? 1500}" style="width:80px;box-sizing:border-box;text-align:right"/></div>
      </div>
      <div class="setting-row" style="align-items:center">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">
          <span class="setting-label">${t("tlsFragment")}</span>
          <span style="font-size:11px;opacity:.5;font-weight:400">${t("tlsFragmentHint")}</span>
        </div>
        <div class="setting-value"><label class="toggle"><input type="checkbox" id="set-tls-fragment" ${settings.tls_fragment ? "checked" : ""}/><span class="toggle-slider"></span></label></div>
      </div>
      <div class="setting-row"><span class="setting-label">${t("killSwitch")}</span><div class="setting-value"><label class="toggle"><input type="checkbox" id="set-ks" ${settings.kill_switch ? "checked" : ""}/><span class="toggle-slider"></span></label></div></div>
      <div class="setting-row"><span class="setting-label">${t("ipv6Label")}</span><div class="setting-value"><label class="toggle"><input type="checkbox" id="set-ipv6" ${settings.ipv6 ? "checked" : ""}/><span class="toggle-slider"></span></label></div></div>
      <div class="setting-row" style="align-items:flex-start">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">
          <span class="setting-label">${t("bypassRu")}</span>
          <span style="font-size:11px;opacity:.5;font-weight:400">${t("bypassRuHint")}</span>
        </div>
        <div class="setting-value"><label class="toggle"><input type="checkbox" id="set-bypass-ru" ${settings.bypass_ru !== false ? "checked" : ""}/><span class="toggle-slider"></span></label></div>
      </div>
      <div class="setting-row"><span class="setting-label">${t("theme")}</span><div class="setting-value"><div class="pill-group">
        <button class="pill-btn ${settings.theme === "dark" ? "active" : ""}" data-theme="dark">${t("dark")}</button>
        <button class="pill-btn ${settings.theme === "auto" ? "active" : ""}" data-theme="auto">${t("auto")}</button>
      </div></div></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">${t("shareProxy")}</div>
      <div class="setting-row"><span class="setting-label">${t("mixedPort")}</span><div class="setting-value"><input type="number" id="set-port" value="${settings.mihomo_port}"/></div></div>
      <div class="setting-row" style="align-items:center">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">
          <span class="setting-label">${t("allowLan")}</span>
          <span style="font-size:11px;opacity:.5;font-weight:400">${t("allowLanHint")}</span>
        </div>
        <div class="setting-value"><label class="toggle"><input type="checkbox" id="set-allow-lan" ${settings.allow_lan ? "checked" : ""}/><span class="toggle-slider"></span></label></div>
      </div>
      <div class="setting-row" style="align-items:flex-start">
        <span class="setting-label">${t("socksAuth")}</span>
        <div class="setting-value" style="flex-direction:column;align-items:stretch;gap:6px">
          <input type="text" id="set-socks-user" value="${esc(settings.socks_user || '')}" placeholder="${t("socksUser")}" autocomplete="off" style="width:100%;box-sizing:border-box;text-align:left"/>
          <div style="display:flex;gap:4px;align-items:center">
            <input type="password" id="set-socks-pass" value="${esc(settings.socks_pass || '')}" placeholder="${t("socksPass")}" autocomplete="new-password" style="flex:1;box-sizing:border-box;text-align:left"/>
            <button class="btn-sm" id="btn-toggle-socks-pass" style="flex-shrink:0">👁</button>
          </div>
          ${(settings.socks_user || settings.socks_pass) ? `<div style="font-size:11px;opacity:.5;word-break:break-all;display:flex;align-items:center;gap:4px"><span id="socks-proxy-url">socks5://${esc(settings.socks_user||'')}:${esc(settings.socks_pass||'')}@127.0.0.1:${settings.mihomo_port}</span><button class="btn-sm" id="btn-copy-socks-url" style="flex-shrink:0">${t("copy")}</button></div>` : ''}
          <button class="btn-sm" id="btn-save-socks-auth" style="align-self:flex-end">${t("socksSave")}</button>
        </div>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-section-header"><span class="settings-section-title">${t("whisp")}</span><span class="settings-link">${t("installed")}</span></div>
      <div class="setting-row"><span class="setting-label">${t("hwid")}</span><div class="setting-value"><label class="toggle"><input type="checkbox" id="set-hwid" ${settings.hwid ? "checked" : ""}/><span class="toggle-slider"></span></label></div></div>
      <div class="setting-row"><span class="setting-label">${t("autostart")}</span><div class="setting-value"><label class="toggle"><input type="checkbox" id="set-autostart" ${settings.auto_connect ? "checked" : ""}/><span class="toggle-slider"></span></label></div></div>
      <div class="setting-row"><span class="setting-label">${t("authTip")}</span><div class="setting-value"><label class="toggle"><input type="checkbox" id="set-authtip" ${settings.auth_tip ? "checked" : ""}/><span class="toggle-slider"></span></label></div></div>
      <div class="setting-row"><span class="setting-label">${t("update")}</span><div class="setting-value"><button class="btn-sm" id="btn-open-repo">${t("openRepo")}</button></div></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">${t("checkUpdates")}</div>
      <div class="setting-row">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">
          <span class="setting-label">${t("currentVersion")}</span>
          <span style="font-size:11px;opacity:.5">${sysInfo.version}</span>
        </div>
      </div>
      <div class="setting-row" id="update-result-row" style="display:none;flex-direction:column;align-items:flex-start;gap:6px">
        <div id="update-result-content"></div>
      </div>
      <div class="setting-row">
        <button class="btn-sm" id="btn-check-updates" style="width:100%">${t("checkUpdates")}</button>
      </div>
    </div>
    `;
  }

  return `<div class="page-header"><h2 class="page-title">${t("settings")}</h2></div>
    <div class="settings-section">
      <div class="settings-section-title">${t("mihomo")}</div>
      <div class="setting-row"><span class="setting-label">${t("mixedPort")}</span><div class="setting-value"><input type="number" id="set-port" value="${settings.mihomo_port}"/></div></div>
      <div class="setting-row"><span class="setting-label">${t("bindAddr")}</span><div class="setting-value"><input type="text" id="set-bind" value="${settings.socks_addr}"/><span class="edit-icon">✎</span></div></div>
      <div class="setting-row" style="align-items:center">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">
          <span class="setting-label">${t("allowLan")}</span>
          <span style="font-size:11px;opacity:.5;font-weight:400">${t("allowLanHint")}</span>
        </div>
        <div class="setting-value"><label class="toggle"><input type="checkbox" id="set-allow-lan" ${settings.allow_lan ? "checked" : ""}/><span class="toggle-slider"></span></label></div>
      </div>
      <div class="setting-row"><span class="setting-label">${t("routingMode")}</span><div class="setting-value"><div class="pill-group">
        <button class="pill-btn ${!settings.routing_mode || settings.routing_mode === "rule" ? "active" : ""}" data-rmode="rule">Rule</button>
        <button class="pill-btn ${settings.routing_mode === "global" ? "active" : ""}" data-rmode="global">Global</button>
        <button class="pill-btn ${settings.routing_mode === "direct" ? "active" : ""}" data-rmode="direct">Direct</button>
      </div></div></div>
      <div class="setting-row"><span class="setting-label">${t("logLevel")}</span><div class="setting-value"><div class="pill-group">
        <button class="pill-btn ${!settings.log_level || settings.log_level === "info" ? "active" : ""}" data-loglevel="info">Info</button>
        <button class="pill-btn ${settings.log_level === "debug" ? "active" : ""}" data-loglevel="debug">Debug</button>
        <button class="pill-btn ${settings.log_level === "warning" ? "active" : ""}" data-loglevel="warning">Warning</button>
        <button class="pill-btn ${settings.log_level === "silent" ? "active" : ""}" data-loglevel="silent">Silent</button>
      </div></div></div>
      <div class="setting-row"><span class="setting-label">${t("tunStack")}</span><div class="setting-value"><div class="pill-group">
        <button class="pill-btn ${settings.tun_stack === "Mixed" ? "active" : ""}" data-tun="Mixed">Mixed</button>
        <button class="pill-btn ${settings.tun_stack === "gVisor" ? "active" : ""}" data-tun="gVisor">gVisor</button>
        <button class="pill-btn ${settings.tun_stack === "System" ? "active" : ""}" data-tun="System">System</button>
      </div></div></div>
      <div class="setting-row"><span class="setting-label">${t("theme")}</span><div class="setting-value"><div class="pill-group">
        <button class="pill-btn ${settings.theme === "dark" ? "active" : ""}" data-theme="dark">${t("dark")}</button>
        <button class="pill-btn ${settings.theme === "auto" ? "active" : ""}" data-theme="auto">${t("auto")}</button>
      </div></div></div>
      <div class="setting-row"><span class="setting-label">${t("dnsRedirect")}</span><div class="setting-value"><label class="toggle"><input type="checkbox" id="set-dns" ${settings.dns_redirect ? "checked" : ""}/><span class="toggle-slider"></span></label></div></div>
      <div class="setting-row"><span class="setting-label">${t("dnsServers")}</span><div class="setting-value" style="flex-direction:column;align-items:stretch;gap:4px">
        <input type="text" id="set-custom-dns" value="${esc((settings.custom_dns || []).join(", "))}" placeholder="77.88.8.8, 8.8.8.8" style="width:100%;box-sizing:border-box;text-align:left"/>
        <span style="font-size:11px;opacity:.5">${t("dnsCommaSep")}</span>
      </div></div>
      <div class="setting-row"><span class="setting-label">${t("vpnDns")}</span><div class="setting-value" style="flex-direction:column;align-items:stretch;gap:6px">
        <div class="pill-group" style="flex-wrap:wrap;gap:4px">${vpnDnsPills}</div>
        <input type="text" id="set-vpn-dns" value="${esc(vpnDnsVal)}" placeholder="1.1.1.1:53" style="width:100%;box-sizing:border-box;text-align:left"/>
        <span style="font-size:11px;opacity:.5">${t("vpnDnsHint")}</span>
      </div></div>
      <div class="setting-row"><span class="setting-label">${t("ipv6Label")}</span><div class="setting-value"><label class="toggle"><input type="checkbox" id="set-ipv6" ${settings.ipv6 ? "checked" : ""}/><span class="toggle-slider"></span></label></div></div>
      <div class="setting-row" style="align-items:flex-start">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">
          <span class="setting-label">${t("bypassRu")}</span>
          <span style="font-size:11px;opacity:.5;font-weight:400">${t("bypassRuHint")}</span>
        </div>
        <div class="setting-value"><label class="toggle"><input type="checkbox" id="set-bypass-ru" ${settings.bypass_ru !== false ? "checked" : ""}/><span class="toggle-slider"></span></label></div>
      </div>
      <div class="setting-row"><span class="setting-label">${t("secretLabel")}</span><div class="setting-value"><span class="secret-value">${settings.secret}</span><button class="btn-sm" id="btn-copy-secret">${t("copy")}</button></div></div>
      <div class="setting-row" style="align-items:flex-start">
        <span class="setting-label">${t("socksAuth")}</span>
        <div class="setting-value" style="flex-direction:column;align-items:stretch;gap:6px">
          <input type="text" id="set-socks-user" value="${esc(settings.socks_user || '')}" placeholder="${t("socksUser")}" autocomplete="off" style="width:100%;box-sizing:border-box;text-align:left"/>
          <div style="display:flex;gap:4px;align-items:center">
            <input type="password" id="set-socks-pass" value="${esc(settings.socks_pass || '')}" placeholder="${t("socksPass")}" autocomplete="new-password" style="flex:1;box-sizing:border-box;text-align:left"/>
            <button class="btn-sm" id="btn-toggle-socks-pass" style="flex-shrink:0">👁</button>
          </div>
          ${(settings.socks_user || settings.socks_pass) ? `<div style="font-size:11px;opacity:.5;word-break:break-all;display:flex;align-items:center;gap:4px"><span id="socks-proxy-url">socks5://${esc(settings.socks_user||'')}:${esc(settings.socks_pass||'')}@127.0.0.1:${settings.mihomo_port}</span><button class="btn-sm" id="btn-copy-socks-url" style="flex-shrink:0">${t("copy")}</button></div>` : ''}
          <button class="btn-sm" id="btn-save-socks-auth" style="align-self:flex-end">${t("socksSave")}</button>
        </div>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">${t("advanced")}</div>
      <div class="setting-row"><span class="setting-label">${t("killSwitch")}</span><div class="setting-value"><label class="toggle"><input type="checkbox" id="set-ks" ${settings.kill_switch ? "checked" : ""}/><span class="toggle-slider"></span></label></div></div>
      <div class="setting-row"><span class="setting-label">${t("ipSpoofing")}</span><div class="setting-value" style="flex-direction:column;align-items:stretch;gap:4px">
        <input type="text" id="set-spoof-ips" value="${esc(settings.spoof_ips || '')}" placeholder="192.168.1.10, 192.168.1.11" style="width:100%;box-sizing:border-box;text-align:left"/>
        <span style="font-size:11px;opacity:.5">${t("spoofIpsHint")}</span>
      </div></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-header"><span class="settings-section-title">${t("whisp")}</span><span class="settings-link">${t("installed")}</span></div>
      <div class="setting-row"><span class="setting-label">${t("hwid")}</span><div class="setting-value"><label class="toggle"><input type="checkbox" id="set-hwid" ${settings.hwid ? "checked" : ""}/><span class="toggle-slider"></span></label></div></div>
      <div class="setting-row"><span class="setting-label">${t("autostart")}</span><div class="setting-value"><label class="toggle"><input type="checkbox" id="set-autostart" ${settings.auto_connect ? "checked" : ""}/><span class="toggle-slider"></span></label></div></div>
      <div class="setting-row"><span class="setting-label">${t("authTip")}</span><div class="setting-value"><label class="toggle"><input type="checkbox" id="set-authtip" ${settings.auth_tip ? "checked" : ""}/><span class="toggle-slider"></span></label></div></div>
      <div class="setting-row"><span class="setting-label">${t("config")}</span><div class="setting-value"><button class="btn-sm" id="btn-open-config">${t("open")}</button></div></div>
      <div class="setting-row"><span class="setting-label">${t("update")}</span><div class="setting-value"><button class="btn-sm" id="btn-open-repo">${t("openRepo")}</button></div></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">${t("checkUpdates")}</div>
      <div class="setting-row">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">
          <span class="setting-label">${t("currentVersion")}</span>
          <span style="font-size:11px;opacity:.5">${sysInfo.version}</span>
        </div>
      </div>
      <div class="setting-row" id="update-result-row" style="display:none;flex-direction:column;align-items:flex-start;gap:6px">
        <div id="update-result-content"></div>
      </div>
      <div class="setting-row">
        <button class="btn-sm" id="btn-check-updates" style="width:100%">${t("checkUpdates")}</button>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">TLS Fingerprint</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <span style="font-size:12px;opacity:.55">${t("fpBrowser")}</span>
        <div id="set-fingerprint" class="custom-select" data-value="${currentFingerprint}">
          <div class="custom-select-trigger"><span class="custom-select-label">${({"chrome":"Chrome Auto","chrome_120":"Chrome 120","chrome_115":"Chrome 115","firefox":"Firefox Auto","firefox_120":"Firefox 120","safari":"Safari Auto","ios":"iOS Safari","android":"Android OkHttp","edge":"Edge Auto","random":t("fpRandom")} as Record<string,string>)[currentFingerprint] || currentFingerprint}</span><span class="arrow">▾</span></div>
          <div class="custom-select-options">
            ${[["chrome","Chrome Auto"],["chrome_120","Chrome 120"],["chrome_115","Chrome 115"],["firefox","Firefox Auto"],["firefox_120","Firefox 120"],["safari","Safari Auto"],["ios","iOS Safari"],["android","Android OkHttp"],["edge","Edge Auto"],["random",t("fpRandom")]].map(([v,l])=>`<div class="custom-select-option${currentFingerprint===v?" selected":""}" data-value="${v}">${l}</div>`).join("")}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
          <span id="fp-desc" style="font-size:12px;opacity:.45;flex:1">${getFPDescription(currentFingerprint)}</span>
          ${isConnected ? `<button class="btn-sm" id="btn-fp-apply" style="font-size:11px;padding:3px 10px">${t("fpApplyNow")}</button>` : ""}
        </div>
      </div>
    </div>
    `;
}

function bindSettingsEvents(): void {
  (document.getElementById("set-ks") as HTMLInputElement)?.addEventListener("change", function () {
    settings.kill_switch = this.checked;
    persistSettings();
    if (isConnected) showToast(t("reconnectToApply"), "info", 3000);
  });

  const fpSelect = document.getElementById("set-fingerprint");
  if (fpSelect) {
    const trigger = fpSelect.querySelector(".custom-select-trigger") as HTMLElement;
    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      fpSelect.classList.toggle("open");
    });
    fpSelect.querySelectorAll(".custom-select-option").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const val = (opt as HTMLElement).dataset.value || "";
        currentFingerprint = val;
        fpSelect.dataset.value = val;
        fpSelect.classList.remove("open");
        const label = fpSelect.querySelector(".custom-select-label");
        if (label) label.textContent = opt.textContent || val;
        fpSelect.querySelectorAll(".custom-select-option").forEach((o) => o.classList.remove("selected"));
        opt.classList.add("selected");
        const desc = document.getElementById("fp-desc");
        if (desc) desc.textContent = getFPDescription(val);
        localStorage.setItem("tls_fingerprint", val);
        invoke("patch_app_settings", { patch: { tls_fingerprint: val } }).catch(() => {});
        showToast(`${t("fingerprintSet")} ${val}`, "success", 2000);
      });
    });
    document.addEventListener("click", () => fpSelect.classList.remove("open"));
  }

  document.getElementById("btn-fp-apply")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-fp-apply") as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try {
      // apply_tls_fingerprint only hot-reloads mihomo's own fingerprint (its side
      // connections); the real tunnel's ClientHello is set by go-client at
      // startup via -force-fingerprint, so it only takes effect after a reconnect.
      await invoke("apply_tls_fingerprint").catch(() => {});
      if (isConnected) {
        await doDisconnect();
        await doConnect();
      }
      showToast(`${t("fingerprintSet")} ${currentFingerprint}`, "success", 2000);
    } catch (e) {
      showToast(String(e), "error", 3000);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  (document.getElementById("set-port") as HTMLInputElement)?.addEventListener("change", function () {
    settings.mihomo_port = parseInt(this.value, 10) || 7890;
    persistSettings();
    if (isConnected) showToast(t("reconnectToApply"), "info", 3000);
  });
  (document.getElementById("set-bind") as HTMLInputElement)?.addEventListener("change", function () { settings.socks_addr = this.value; persistSettings(); });
  (document.getElementById("set-custom-dns") as HTMLInputElement)?.addEventListener("change", function () {
    const servers = this.value.split(",").map(s => s.trim()).filter(s => s.length > 0);
    settings.custom_dns = servers;
    persistSettings();
  });
  document.querySelectorAll<HTMLElement>(".pill-btn[data-tun]").forEach(el => el.addEventListener("click", () => { settings.tun_stack = el.dataset.tun || "Mixed"; persistSettings(); renderPage(); }));
  document.querySelectorAll<HTMLElement>(".pill-btn[data-rmode]").forEach(el => el.addEventListener("click", () => { settings.routing_mode = el.dataset.rmode || "rule"; persistSettings(); renderPage(); }));
  document.querySelectorAll<HTMLElement>(".pill-btn[data-loglevel]").forEach(el => el.addEventListener("click", () => { settings.log_level = el.dataset.loglevel || "info"; persistSettings(); renderPage(); }));
  document.querySelectorAll<HTMLElement>(".pill-btn[data-theme]").forEach(el => el.addEventListener("click", () => { settings.theme = el.dataset.theme || "dark"; persistSettings(); renderPage(); }));
  document.querySelectorAll<HTMLElement>(".pill-btn[data-dnsmode]").forEach(el => el.addEventListener("click", () => {
    settings.dns_mode = el.dataset.dnsmode || "udp";
    persistSettings();
    if (isConnected) showToast(t("reconnectToApply"), "info", 3000);
    renderPage();
  }));
  document.querySelectorAll<HTMLElement>(".pill-btn[data-dnsstrategy]").forEach(el => el.addEventListener("click", () => {
    settings.dns_strategy = el.dataset.dnsstrategy || "fakeip";
    persistSettings();
    if (isConnected) showToast(t("reconnectToApply"), "info", 3000);
    renderPage();
  }));
  (document.getElementById("set-mtu") as HTMLInputElement)?.addEventListener("change", function () {
    const v = parseInt(this.value, 10);
    settings.mtu = Number.isFinite(v) ? Math.min(9000, Math.max(576, v)) : 1500;
    this.value = String(settings.mtu);
    persistSettings();
    if (isConnected) showToast(t("reconnectToApply"), "info", 3000);
  });
  (document.getElementById("set-tls-fragment") as HTMLInputElement)?.addEventListener("change", function () {
    settings.tls_fragment = this.checked;
    persistSettings();
    if (isConnected) showToast(t("reconnectToApply"), "info", 3000);
  });
  document.querySelectorAll<HTMLElement>(".pill-btn[data-vpndns]").forEach(el => el.addEventListener("click", () => {
    const val = el.dataset.vpndns || "1.1.1.1:53";
    settings.vpn_dns = val === "1.1.1.1:53" && !el.classList.contains("active") ? val : val;
    const inp = document.getElementById("set-vpn-dns") as HTMLInputElement;
    if (inp) inp.value = val;
    persistSettings();
    renderPage();
  }));
  (document.getElementById("set-vpn-dns") as HTMLInputElement)?.addEventListener("change", function () {
    settings.vpn_dns = this.value.trim();
    persistSettings();
  });
  document.getElementById("btn-toggle-socks-pass")?.addEventListener("click", () => {
    const inp = document.getElementById("set-socks-pass") as HTMLInputElement | null;
    if (inp) inp.type = inp.type === "password" ? "text" : "password";
  });
  document.getElementById("btn-save-socks-auth")?.addEventListener("click", () => {
    const user = (document.getElementById("set-socks-user") as HTMLInputElement | null)?.value.trim() ?? "";
    const pass = (document.getElementById("set-socks-pass") as HTMLInputElement | null)?.value ?? "";
    settings.socks_user = user;
    settings.socks_pass = pass;
    persistSettings();
    if (isConnected) showToast(t("reconnectToApply"), "info", 3000);
    renderPage();
  });
  document.getElementById("btn-copy-socks-url")?.addEventListener("click", () => {
    const url = (document.getElementById("socks-proxy-url") as HTMLElement | null)?.textContent ?? "";
    clipboardWrite(url);
  });

  (document.getElementById("set-spoof-ips") as HTMLInputElement)?.addEventListener("change", function () {
    settings.spoof_ips = this.value.trim();
    persistSettings();
    if (isConnected) showToast(t("reconnectToApply"), "info", 3000);
  });
  const toggles: [string, keyof AppSettings][] = [["set-dns", "dns_redirect"], ["set-ipv6", "ipv6"], ["set-hwid", "hwid"], ["set-autostart", "auto_connect"], ["set-authtip", "auth_tip"], ["set-bypass-ru", "bypass_ru"]];
  toggles.forEach(([id, key]) => { (document.getElementById(id) as HTMLInputElement)?.addEventListener("change", function () { (settings as any)[key] = this.checked; persistSettings(); }); });
  (document.getElementById("set-allow-lan") as HTMLInputElement)?.addEventListener("change", function () {
    settings.allow_lan = this.checked;
    persistSettings();
    if (isConnected) showToast(t("reconnectToApply"), "info", 3000);
  });
  document.getElementById("btn-copy-secret")?.addEventListener("click", () => {
    clipboardWrite(settings.secret);
    showToast(t("secretCopied"), "success", 1800);
  });
  document.getElementById("btn-open-repo")?.addEventListener("click", () => invoke("open_url", { url: "https://github.com/Jalaveyan/Whispera" }).catch(() => { }));
  document.getElementById("btn-open-config")?.addEventListener("click", () => invoke("open_config_dir").catch(() => { }));
  document.getElementById("btn-check-updates")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-check-updates") as HTMLButtonElement;
    const row = document.getElementById("update-result-row") as HTMLElement;
    const content = document.getElementById("update-result-content") as HTMLElement;
    if (!btn || !row || !content) return;

    btn.disabled = true;
    btn.textContent = t("checking") + "...";
    row.style.display = "none";

    try {
      const info = await invoke<{
        tag: string; name: string; body: string;
        html_url: string; download_url: string; is_newer: boolean;
      }>("check_for_updates");

      row.style.display = "flex";

      if (info.is_newer) {
        osNotify(t("updateAvailableNew"), info.tag);
        content.innerHTML = `
          <div style="font-size:13px;font-weight:600;color:var(--md-primary)">${t("updateAvailableNew")}: ${esc(info.tag)}</div>
          ${info.body ? `<div style="font-size:11px;opacity:.6;margin-top:4px;max-height:80px;overflow-y:auto;white-space:pre-wrap">${esc(info.body.slice(0, 400))}</div>` : ""}
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            ${info.download_url ? `<button class="btn-sm" id="btn-install-update">${t("installUpdate")}</button>` : ""}
            <button class="btn-sm" id="btn-open-release" style="opacity:.7">${t("openRelease")}</button>
          </div>`;

        document.getElementById("btn-install-update")?.addEventListener("click", async () => {
          const b = document.getElementById("btn-install-update") as HTMLButtonElement;
          if (b) { b.disabled = true; b.textContent = t("loading") + "..."; }
          try {
            await invoke("install_update", { downloadUrl: info.download_url, htmlUrl: info.html_url });
          } catch (e) {
            showToast(String(e), "error", 5000);
            if (b) { b.disabled = false; b.textContent = t("installUpdate"); }
          }
        });

        document.getElementById("btn-open-release")?.addEventListener("click", () => {
          invoke("open_url", { url: info.html_url }).catch(() => {});
        });
      } else {
        content.innerHTML = `<div style="font-size:13px;color:var(--md-primary)">${t("upToDate")} (${esc(info.tag)})</div>`;
      }
    } catch (e) {
      row.style.display = "flex";
      content.innerHTML = `<div style="color:var(--danger);font-size:12px">${esc(String(e))}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = t("checkUpdates");
    }
  });
}

function showProfileModal(prefillKey?: string): void {
  const ov = document.createElement("div");
  ov.className = "modal-overlay";
  ov.innerHTML = `<div class="modal"><h3>${t("addProfile")}</h3>
    <div class="modal-field"><label>${t("profileName")}</label><input type="text" id="modal-name"/></div>
    <div class="modal-field"><label>${t("profileKey")}</label><textarea id="modal-key" rows="3">${prefillKey ? esc(prefillKey) : ""}</textarea></div>
    <div class="modal-actions"><button class="btn-cancel" id="modal-cancel">${t("cancel")}</button><button class="btn-save" id="modal-save">${t("save")}</button></div>
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
  document.getElementById("modal-cancel")?.addEventListener("click", () => ov.remove());
  document.getElementById("modal-save")?.addEventListener("click", () => {
    const name = (document.getElementById("modal-name") as HTMLInputElement).value.trim();
    const key = (document.getElementById("modal-key") as HTMLTextAreaElement).value.trim();
    if (!name || !key) return;
    profiles.push({ id: Date.now().toString(), name, key });
    saveProfiles();
    if (!settings.conn_key) { settings.conn_key = key; persistSettings(); }
    ov.remove(); renderPage();
  });
}

function classifyPastedText(text: string): { kind: "key" | "url" | "unknown"; value: string } {
  const trimmed = text.trim();
  if (/^whispera:\/\//i.test(trimmed)) return { kind: "key", value: trimmed };
  if (/^https?:\/\//i.test(trimmed)) return { kind: "url", value: trimmed };
  return { kind: "unknown", value: trimmed };
}

function handlePastedOrScannedText(text: string): void {
  const { kind, value } = classifyPastedText(text);
  if (kind === "key") showProfileModal(value);
  else if (kind === "url") showSubModal(value);
  else showToast(t("pasteUnrecognized"), "error", 3000);
}

function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function playConnectSound(): void {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Trigger click
    const trigOsc = ctx.createOscillator();
    const trigGain = ctx.createGain();
    trigOsc.connect(trigGain); trigGain.connect(ctx.destination);
    trigOsc.type = "sawtooth";
    trigOsc.frequency.setValueAtTime(90, now);
    trigOsc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
    trigGain.gain.setValueAtTime(0.18, now);
    trigGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    trigOsc.start(now); trigOsc.stop(now + 0.15);

    // Rising frequency sweep (capacitor whine)
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    const sweepFilter = ctx.createBiquadFilter();
    sweepOsc.connect(sweepFilter); sweepFilter.connect(sweepGain); sweepGain.connect(ctx.destination);
    sweepOsc.type = "sawtooth";
    sweepFilter.type = "bandpass";
    sweepOsc.frequency.setValueAtTime(160, now + 0.05);
    sweepOsc.frequency.exponentialRampToValueAtTime(4200, now + 0.75);
    sweepFilter.frequency.setValueAtTime(400, now + 0.05);
    sweepFilter.frequency.exponentialRampToValueAtTime(5000, now + 0.75);
    sweepGain.gain.setValueAtTime(0.0, now);
    sweepGain.gain.linearRampToValueAtTime(0.16, now + 0.22);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);
    sweepOsc.start(now + 0.05); sweepOsc.stop(now + 0.8);

    // High shimmer harmonics
    [1800, 2600, 3400].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.6, now + 0.95);
      g.gain.setValueAtTime(0.0, now);
      g.gain.linearRampToValueAtTime(0.038 - i * 0.008, now + 0.28 + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.95 + i * 0.04);
      osc.start(now + 0.18); osc.stop(now + 1.0 + i * 0.04);
    });

    // Noise whoosh — bandpass sweep up
    const bufLen = Math.floor(ctx.sampleRate * 1.3);
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noiseSrc.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination);
    noiseFilter.type = "bandpass";
    noiseFilter.Q.value = 2.5;
    noiseFilter.frequency.setValueAtTime(350, now + 0.1);
    noiseFilter.frequency.exponentialRampToValueAtTime(7000, now + 1.0);
    noiseGain.gain.setValueAtTime(0.0, now);
    noiseGain.gain.linearRampToValueAtTime(0.10, now + 0.25);
    noiseGain.gain.setValueAtTime(0.10, now + 0.65);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
    noiseSrc.start(now + 0.1); noiseSrc.stop(now + 1.3);

    // Digital glitch artifacts
    for (let i = 0; i < 5; i++) {
      const g = ctx.createOscillator();
      const gv = ctx.createGain();
      g.connect(gv); gv.connect(ctx.destination);
      g.type = "square";
      g.frequency.setValueAtTime(1800 + i * 900 + Math.random() * 500, now + 0.48 + i * 0.065);
      gv.gain.setValueAtTime(0.025, now + 0.48 + i * 0.065);
      gv.gain.exponentialRampToValueAtTime(0.001, now + 0.48 + i * 0.065 + 0.045);
      g.start(now + 0.48 + i * 0.065); g.stop(now + 0.48 + i * 0.065 + 0.05);
    }

    setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch { /**/ }
}

function playDisconnectSound(): void {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Falling sweep (de-cloak power-down)
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    const sweepFilter = ctx.createBiquadFilter();
    sweepOsc.connect(sweepFilter); sweepFilter.connect(sweepGain); sweepGain.connect(ctx.destination);
    sweepOsc.type = "sawtooth";
    sweepFilter.type = "bandpass";
    sweepOsc.frequency.setValueAtTime(3800, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(120, now + 0.65);
    sweepFilter.frequency.setValueAtTime(4500, now);
    sweepFilter.frequency.exponentialRampToValueAtTime(200, now + 0.65);
    sweepGain.gain.setValueAtTime(0.14, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
    sweepOsc.start(now); sweepOsc.stop(now + 0.7);

    // Noise whoosh — bandpass sweep down
    const bufLen = Math.floor(ctx.sampleRate * 0.9);
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noiseSrc.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination);
    noiseFilter.type = "bandpass";
    noiseFilter.Q.value = 2.0;
    noiseFilter.frequency.setValueAtTime(5500, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(280, now + 0.7);
    noiseGain.gain.setValueAtTime(0.09, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    noiseSrc.start(now); noiseSrc.stop(now + 0.9);

    // Shimmer fade-out
    [3200, 2200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.6);
      g.gain.setValueAtTime(0.03, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.55 + i * 0.05);
      osc.start(now); osc.stop(now + 0.6 + i * 0.05);
    });

    // Low thud at end
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.connect(thudGain); thudGain.connect(ctx.destination);
    thudOsc.type = "sine";
    thudOsc.frequency.setValueAtTime(85, now + 0.55);
    thudOsc.frequency.exponentialRampToValueAtTime(40, now + 0.75);
    thudGain.gain.setValueAtTime(0.18, now + 0.55);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);
    thudOsc.start(now + 0.55); thudOsc.stop(now + 0.8);

    setTimeout(() => ctx.close().catch(() => {}), 1100);
  } catch { /**/ }
}

/* ===================== INIT ===================== */
window.addEventListener("DOMContentLoaded", async () => {
  loadLang(); loadProfiles();
  await loadSettings();
  initNotifications().catch(() => {});
  document.addEventListener("click", () => {
    document.querySelectorAll<HTMLElement>(".key-menu").forEach(m => { m.hidden = true; });
  });
  await Promise.all([
    loadSubscriptions(),
    loadRoutingRules(),
    loadBlocklist(),
    checkStatus(),
  ]);
  renderShell();
  fetchSysInfo();
  startSubAutoCheck();

  // On Android autostart means "reconnect once after a phone reboot" — handled
  // natively by BootReceiver, NOT on every app launch. So skip auto-connect on
  // open for Android; on desktop keep connect-on-launch behaviour.
  if (!isAndroid && settings.auto_connect && !isConnected && settings.conn_key && !isConnecting) {
    doConnect();
  }
  setInterval(() => { if (isConnected && connectTime) tickUptime(); }, 1000);

  // silent periodic status check — no re-render unless status changed
  setInterval(async () => {
    const prev = isConnected;
    await checkStatus();
    if (prev !== isConnected) updateHome();
  }, 10000);
});
