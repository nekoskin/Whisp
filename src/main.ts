import { invoke } from "@tauri-apps/api/core";
import { readText as clipboardRead, writeText as clipboardWrite } from "@tauri-apps/plugin-clipboard-manager";
import * as topojson from "topojson-client";
import worldAtlas from "world-atlas/land-110m.json";
import "./styles.css";

const _landGeo = topojson.feature(worldAtlas as any, (worldAtlas as any).objects.land);

const ICONS = {
  ml: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>`,
  bolt: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  wifi: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
  user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  log: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  globe: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  refresh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  play: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  link: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  ping: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  pencil: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
};

interface MultiBridgeEntry {
  id: string;
  address: string;
  rules: string[]; // domain/IP/CIDR patterns routed to this bridge
}

interface AppSettings {
  conn_key: string;
  extra_keys?: string[];
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
  ml_token?: string;
  ml_server?: string;
  ml_transport?: string;
  p2p_relay_addr?: string;
  p2p_secret?: string;
  custom_dns?: string[];
  vpn_dns?: string;
  mitm_enabled?: boolean;
  spoof_ips?: string;
  multi_bridges?: MultiBridgeEntry[];
  tls_fingerprint?: string;
  bypass_ru?: boolean;
  socks_user?: string;
  socks_pass?: string;
  allow_lan?: boolean;
  log_level?: string;
  routing_mode?: string;
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

interface SiteCheck {
  name: string;
  letter: string;
  cssClass: string;
  url: string;
  status: "checking" | "ok" | "timeout";
  ping: number;
}

type Page = "home" | "connections" | "profiles" | "routing" | "logs" | "settings" | "bridges";
type Lang = "ru" | "en" | "zh" | "fa";

interface BridgeInfo {
  id: string;
  name?: string;
  lat: number;
  lon: number;
  country?: string;
  city?: string;
  region?: string;
  alive: boolean;
  latency_ms?: number;
  type?: string;
  address?: string;
  load?: number;
  bandwidth_mbps?: number;
  cur_users?: number;
  max_users?: number;
  version?: string;
  distance_km?: number;
  ml_score?: number;
  ml_reason?: string;
  blacklisted?: boolean;
  loss_pct?: number;
  provider?: string;
  last_check?: string;
}

interface MLNetworkAnalysis {
  dpi_risk: "low" | "medium" | "high" | "critical";
  recommended_transport: string;
  recommended_reason: string;
  avg_rtt_ms: number | null;
  reachable: number;
  total_probed: number;
}

interface MLTransportRecommendation {
  dpi_risk: string;
  transport: string;
  options: string;
  description: string;
}

/** Haversine distance between two coordinates, returns km. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

let userLat = 0, userLon = 0;

interface RoutingRule {
  id: string;
  kind: "domain" | "process" | "domain-keyword" | "domain-full" | "ip";
  value: string;
  action: "DIRECT" | "PROXY" | "REJECT";
}

const i18n: Record<Lang, Record<string, string>> = {
  ru: {
    home: "Главная", connections: "Соединения", profiles: "Профили", routing: "Маршруты", logs: "Журнал", settings: "Настройки", bridges: "Мосты", ml: "Режим ML",
    mlTitle: "Режим ML", mlStatus: "Статус", mlRunning: "Запущен", mlStopped: "Остановлен",
    mlStart: "Запустить", mlStop: "Остановить", mlRestart: "Перезапустить",
    mlNoBinary: "Файл whispera-ml-server.exe не найден рядом с клиентом",
    mlServer: "ML Сервер", mlEndpoint: "Адрес", mlLogs: "Логи",
    mlClearLogs: "Очистить", mlRefreshLogs: "Обновить",
    mlFallback: "Режим работы", mlFallbackOn: "Fallback (встроенный)", mlFallbackOff: "Go ML активен",
    mlDesc: "ML анализирует трафик в реальном времени и адаптирует обфускацию под текущий DPI",
    mlNetworkAnalysis: "Анализ сети", mlRunAnalysis: "Анализировать сеть", mlAnalyzing: "Анализирую...",
    mlDpiRisk: "Риск DPI", mlDpiLow: "Низкий", mlDpiMedium: "Средний", mlDpiHigh: "Высокий", mlDpiCritical: "Критический",
    mlAvgRtt: "Средний RTT", mlReachable: "Хостов доступно",
    mlTransportRec: "Рекомендуемый транспорт", mlTransportDesc: "Почему",
    mlScanFirst: "Нажмите «Анализировать сеть» для рекомендации транспорта",
    mlTraining: "Тренировка модели", mlTrainStart: "Запустить тренировку", mlTrainStop: "Остановить",
    mlTrainRunning: "Тренируется...", mlTrainEpoch: "Эпоха", mlTrainLoss: "Loss", mlTrainProgress: "Прогресс",
    mlTrainDone: "Тренировка завершена", mlTrainFailed: "Ошибка тренировки",
    mlPortScan: "Сканирование портов", mlScanStart: "Сканировать", mlScanRunning: "Сканирование...",
    mlScanHost: "Хост", mlScanPort: "Порт", mlScanService: "Сервис", mlScanLatency: "Задержка",
    mlScanOpen: "открыт", mlScanClosed: "закрыт", mlScanNoResults: "Нет результатов",
    mlFederated: "Федеративное обучение", mlFedExport: "Экспорт дельты", mlFedImport: "Импорт дельты",
    mlFedLosses: "Loss метрики", mlFedExported: "Дельта экспортирована", mlFedImported: "Дельта импортирована",
    mlDatasets: "Датасеты", mlDsCapture: "Захватить", mlDsUpload: "Загрузить", mlDsEmpty: "Нет датасетов", mlDsExport: "Экспорт датасета", mlDsExporting: "Экспорт...", mlDsAutoExport: "Авто-экспорт",
    mlFeedback: "Обратная связь", mlFbSuccess: "Успех", mlFbFail: "Ошибка", mlFbTotal: "Всего", mlFbLatency: "Задержка",
    mlFbNoData: "Нет данных", mlFbSend: "Отправить результат",
    mlModelMgmt: "Управление моделью", mlModelReload: "Перезагрузить модель", mlModelParams: "Параметров",
    mlModelAccuracy: "Точность", mlModelSamples: "Сэмплов", mlModelEngine: "Движок",
    mlTargetServer: "Целевой сервер", mlTargetServerHint: "host:port, например 1.2.3.4:8443",
    mlToken: "ML Токен", mlTokenHint: "PSK токен для авторизации",
    mlConnect: "Подключить через ML", mlConnecting: "Подключение...", mlDisconnect: "Отключить",
    mlBridgesRanked: "Мосты проранжированы ML", mlScore: "ML",
    bridgesTitle: "Карта мостов", noBridges: "Нет доступных мостов", bridgeConnect: "Подключить",
    bridgesAlive: "Активных", bridgesTotal: "Всего", bridgesLatency: "Пинг", bridgesRefresh: "Обновить",
    bridgesNoKey: "Укажите ключ подключения в Настройках чтобы загрузить мосты",
    bridgesConnecting: "Подключение к мосту...", bridgesConnected: "Ключ моста установлен",
    bridgesTabAll: "Все", bridgesMLBest: "ML лучший", bridgeMLExpertTip: "Только для опытных: нейросеть ещё плохо обучена. Результаты могут быть неточными.",
    bridgesPinging: "Пингуем мосты...", bridgesScanPing: "TCP пинг всех",
    bridgeLoad: "Нагрузка", bridgeUsers: "Пользователи", bridgeBW: "Канал", bridgeLocation: "Локация",
    bridgeProvider: "Провайдер", bridgeVersion: "Версия", bridgeDist: "Расстояние",
    bridgeSSHTitle: "SSH ключ доступа", bridgeSSHUser: "User ID", bridgeSSHIssue: "Выдать ключ",
    bridgeRolloutTitle: "Раскатка обновления", bridgeRolloutVer: "Версия", bridgeRolloutBtn: "Раскатить",
    bridgeRolloutStarted: "Раскатка запущена...", bridgeRolloutDone: "Раскатка завершена",
    bridgesMLNotReady: "ML не готов или список мостов пуст",
    connection: "ПОДКЛЮЧЕНИЕ", noProfile: "Нет профиля", disconnected: "Отключено", connected: "Подключено",
    keyPlaceholder: "Вставьте ключ...", connect: "Connect", disconnect: "Disconnect",
    siteCheck: "ПРОВЕРКА САЙТОВ", timeout: "Timeout", ok: "OK", checking: "...",
    ipInfo: "IP ИНФОРМАЦИЯ", ipAddress: "IP Адрес", location: "Местоположение", provider: "Провайдер",
    system: "СИСТЕМА", os: "ОС", uptime: "Время работы", version: "Версия", admin: "Админ",
    activeConns: "Активные соединения", connectToSee: "Подключитесь чтобы увидеть соединения",
    noProfiles: "Нет сохранённых профилей", addProfile: "Добавить профиль",
    systemLog: "Системный журнал", logReady: "Система готова. Ожидание логов...",
    mixedPort: "Смешанный порт :", bindAddr: "Привязать адрес :", tunStack: "Tun Stack :",
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
    paste: "Вставить", connecting: "Подключение...", disconnecting: "Отключение...",
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
    noSubscriptions: "Нет подписок", subKeys: "ключей", subRefreshing: "Обновление...",
    subRefresh: "Обновить", subDelete: "Удалить", subLastUpdated: "Обновлено",
    subSelectKey: "Выбрать ключ", subRename: "Переименовать",
    pingKey: "Пинг", pingAll: "Пинг всех", pingMs: "мс", pingTimeout: "timeout", pingRunning: "...",
    loading: "Загрузка…",
    copied: "Скопировано",
    keyPasted: "Ключ вставлен",
    clipboardEmpty: "Буфер пуст",
    clipboardFail: "Ошибка чтения буфера",
    vpnConnected: "Подключено",
    vpnDisconnected: "Отключено",
    muxOn: "MUX включён",
    muxOff: "MUX выключен",
    muxEnabled: "MUX включён",
    muxDisabled: "MUX выключен",
    connClosed: "Соединение закрыто",
    bridgeUpdated: "Мост обновлён",
    speedUpdated: "Скорость обновлена",
    portUpdated: "Порт обновлён",
    keyRemoved: "Ключ удалён",
    keyInvalidFormat: "Неверный формат ключа",
    encapRemoved: "Инкапсуляция снята",
    encapApplied: "Инкапсуляция применена",
    selectTwoConns: "Выберите два разных соединения",
    noRecommendation: "Нет рекомендации",
    noActiveConns: "Нет активных соединений",
    enterRelayAddr: "Укажите адрес ретранслятора",
    enterPeerId: "Введите Peer ID",
    p2pEstablished: "P2P соединение установлено",
    p2pRegistered: "зарегистрирован",
    p2pInactive: "не активен",
    p2pRelayAddr: "Адрес ретранслятора",
    p2pSecret: "Секрет",
    p2pSharedSecret: "общий секрет",
    p2pConnectTo: "Подключиться к",
    p2pRegister: "Зарегистрироваться",
    p2pDisconnect: "Отключиться",
    p2pConnectPeer: "Подключиться",
    p2pCancel: "Отменить",
    p2pCopied: "Скопировано",
    p2pRelay: "P2P ретранслятор",
    p2pConnected: "подключён",
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
    connEncap: "Инкапсуляция соединений",
    connEncapDesc: "Туннелирует одно соединение внутри другого — внешнее маскирует внутреннее.",
    connEncapOuter: "Внешнее",
    connEncapInner: "Внутреннее",
    connNeedTwo: "Нужно минимум 2 соединения",
    connCountLabel: "Соединений",
    connKeysConfigured: "Настроено ключей",
    connEncapTitle: "Объединение ключей",
    connEncapDesc2: "Каждый дополнительный ключ создаёт отдельное соединение с независимым транспортом.",
    connAdd: "Добавить",
    connNoActive: "Нет активных соединений",
    connKeyEncrypted: "зашифрован",
    listView: "Список",
    nodeGraph: "Node-граф",
    nodeDragHint: "Перетащи узел за заголовок · Соедини узлы: потяни правый порт ○ на левый ○ другого узла",
    portIn: "Порт входа — перетащи сюда выход другого узла",
    portOut: "Порт выхода — перетащи на вход другого узла",
    nodeServer: "Сервер",
    nodeEnableDisable: "Вкл/Выкл",
    nodeDuplicate: "Дублировать соединение",
    nodeDup: "Дубл",
    nodeUnchain: "Снять инкапсуляцию",
    nodeBridgePlaceholder: "Мост host:port",
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
    subUpdateFailed: "Ошибка обновления",
    secretCopied: "Secret скопирован",
    updateAvailable: "Установлена актуальная версия",
    updateCheckFailed: "Не удалось проверить обновления",
    reconnectToApply: "Изменение вступит в силу после переподключения",
    dnsServers: "DNS серверы",
    dnsCommaSep: "Через запятую, пусто = по умолчанию",
    vpnDns: "Прокси DNS (клиент)",
    vpnDnsHint: "DNS для прокси-клиента. 'Провайдер' = системный резолвер",
    isp: "Провайдер",
    bypassRu: "Обходить .ru / .su напрямую",
    bypassRuHint: "GEOIP Россия + домены .ru/.su идут напрямую, минуя VPN",
    advanced: "Расширенные",
    mitmInspection: "MITM-инспекция",
    mitmDesc: "Локальный TLS-перехват. Требует установить CA в систему (порт 10899)",
    spoofIpsHint: "Список локальных IP для ротации источника. Пусто = отключено",
    ipSpoofing: "IP Spoofing",
    caCert: "CA сертификат",
    installMitmCa: "Установить CA",
    allowLan: "Разрешить LAN",
    allowLanHint: "Другие устройства в сети смогут использовать этот прокси",
    logLevel: "Уровень логов",
    routingMode: "Режим маршрутизации",
    socksAuth: "SOCKS5 аутентификация",
    socksUser: "Логин",
    socksPass: "Пароль",
    socksProxyUrl: "URL прокси",
    socksSave: "Сохранить",
    reconnectRequired: "Переподключитесь для применения правила",
    bridgesTitle2: "Бриджи",
    bridgeRefreshTip: "Обновить",
    bridgePingAllTip: "Пинг всех",
    bridgeSearchPlaceholder: "Поиск бриджа…",
    bridgesAllTab: "Все", bridgeTabWhite: "Белые", bridgeTabBlocked: "Заблокированные",
    bridgeLocationMap: "Карта расположения",
    bridgeVersionLabel: "Версия",
    bridgeNoConnData: "Нет данных подключения",
    logSearchPlaceholder: "Поиск в логах...",
    logAll: "Все",
    mlServerStarting: "ML сервер запускается...",
    mlServerStopped: "ML сервер остановлен",
    mlServerRestarted: "ML сервер перезапущен",
    mlUnavailable: "ML сервер недоступен",
    mlInvalidToken: "ML: неверный токен — обновите в настройках",
    mlScanFailed: "Ошибка сканирования",
    mlModelReloaded: "Модель перезагружена",
    mlDatasetCaptured: "Датасет захвачен",
    mlTrainClickHint: "Нажмите чтобы начать тренировку",
    vpnConnTransport: "Подключено · транспорт:",
    encapsulatedIn: "инкапсулировано в",
    transportSet: "Транспорт →",
    duplicated: "Дублировано",
    duplicatedTo: "Дублировано →",
    keyAdded: "Ключ добавлен (всего",
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
    home: "Home", connections: "Connections", profiles: "Profiles", routing: "Routing", logs: "Logs", settings: "Settings", bridges: "Bridges", ml: "ML Mode",
    mlTitle: "ML Mode", mlStatus: "Status", mlRunning: "Running", mlStopped: "Stopped",
    mlStart: "Start", mlStop: "Stop", mlRestart: "Restart",
    mlNoBinary: "whispera-ml-server.exe not found next to the client",
    mlServer: "ML Server", mlEndpoint: "Endpoint", mlLogs: "Logs",
    mlClearLogs: "Clear", mlRefreshLogs: "Refresh",
    mlFallback: "Mode", mlFallbackOn: "Fallback (built-in)", mlFallbackOff: "Go ML active",
    mlDesc: "ML analyses traffic in real-time and adapts obfuscation to the current DPI",
    mlNetworkAnalysis: "Network Analysis", mlRunAnalysis: "Analyse network", mlAnalyzing: "Analysing...",
    mlDpiRisk: "DPI Risk", mlDpiLow: "Low", mlDpiMedium: "Medium", mlDpiHigh: "High", mlDpiCritical: "Critical",
    mlAvgRtt: "Avg RTT", mlReachable: "Hosts reachable",
    mlTransportRec: "Recommended transport", mlTransportDesc: "Why",
    mlScanFirst: "Click «Analyse network» to get a transport recommendation",
    mlTraining: "Model Training", mlTrainStart: "Start Training", mlTrainStop: "Stop",
    mlTrainRunning: "Training...", mlTrainEpoch: "Epoch", mlTrainLoss: "Loss", mlTrainProgress: "Progress",
    mlTrainDone: "Training complete", mlTrainFailed: "Training failed",
    mlPortScan: "Port Scan", mlScanStart: "Scan", mlScanRunning: "Scanning...",
    mlScanHost: "Host", mlScanPort: "Port", mlScanService: "Service", mlScanLatency: "Latency",
    mlScanOpen: "open", mlScanClosed: "closed", mlScanNoResults: "No results",
    mlFederated: "Federated Learning", mlFedExport: "Export Delta", mlFedImport: "Import Delta",
    mlDatasets: "Datasets", mlDsCapture: "Capture", mlDsUpload: "Upload", mlDsEmpty: "No datasets", mlDsExport: "Export Dataset", mlDsExporting: "Exporting...", mlDsAutoExport: "Auto-export",
    mlFeedback: "Feedback", mlFbSuccess: "Success", mlFbFail: "Fail", mlFbTotal: "Total", mlFbLatency: "Latency",
    mlFbNoData: "No data", mlFbSend: "Send result",
    mlModelMgmt: "Model Management", mlModelReload: "Reload Model", mlModelParams: "Parameters",
    mlModelAccuracy: "Accuracy", mlModelSamples: "Samples", mlModelEngine: "Engine",
    mlFedLosses: "Loss Metrics", mlFedExported: "Delta exported", mlFedImported: "Delta imported",
    mlTargetServer: "Target server", mlTargetServerHint: "host:port, e.g. 1.2.3.4:8443",
    mlToken: "ML Token", mlTokenHint: "PSK auth token",
    mlConnect: "Connect via ML", mlConnecting: "Connecting...", mlDisconnect: "Disconnect",
    mlBridgesRanked: "Bridges ranked by ML", mlScore: "ML",
    bridgesTitle: "Bridge Map", noBridges: "No bridges available", bridgeConnect: "Connect",
    bridgesAlive: "Alive", bridgesTotal: "Total", bridgesLatency: "Latency", bridgesRefresh: "Refresh",
    bridgesNoKey: "Set a connection key in Settings to load bridges",
    bridgesConnecting: "Connecting to bridge...", bridgesConnected: "Bridge key set",
    bridgesTabAll: "All", bridgesMLBest: "ML Best", bridgeMLExpertTip: "Expert users only: neural network is not well-trained yet. Results may be inaccurate.",
    bridgesPinging: "Pinging bridges...", bridgesScanPing: "TCP ping all",
    bridgeLoad: "Load", bridgeUsers: "Users", bridgeBW: "Bandwidth", bridgeLocation: "Location",
    bridgeProvider: "Provider", bridgeVersion: "Version", bridgeDist: "Distance",
    bridgeSSHTitle: "SSH Access Key", bridgeSSHUser: "User ID", bridgeSSHIssue: "Issue Key",
    bridgeRolloutTitle: "Update Rollout", bridgeRolloutVer: "Version", bridgeRolloutBtn: "Roll Out",
    bridgeRolloutStarted: "Rollout started...", bridgeRolloutDone: "Rollout complete",
    bridgesMLNotReady: "ML not ready or bridge list is empty",
    connection: "CONNECTION", noProfile: "No profile", disconnected: "Disconnected", connected: "Connected",
    keyPlaceholder: "Paste key...", connect: "Connect", disconnect: "Disconnect",
    siteCheck: "SITE CHECK", timeout: "Timeout", ok: "OK", checking: "...",
    ipInfo: "IP INFORMATION", ipAddress: "IP Address", location: "Location", provider: "Provider",
    system: "SYSTEM", os: "OS", uptime: "Uptime", version: "Version", admin: "Admin",
    activeConns: "Active connections", connectToSee: "Connect to see connections",
    noProfiles: "No saved profiles", addProfile: "Add profile",
    systemLog: "System Log", logReady: "System ready. Waiting for logs...",
    mixedPort: "Mixed port :", bindAddr: "Bind address :", tunStack: "Tun Stack :",
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
    paste: "Paste", connecting: "Connecting...", disconnecting: "Disconnecting...",
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
    noSubscriptions: "No subscriptions", subKeys: "keys", subRefreshing: "Refreshing...",
    subRefresh: "Refresh", subDelete: "Delete", subLastUpdated: "Updated",
    subSelectKey: "Use key", subRename: "Rename",
    pingKey: "Ping", pingAll: "Ping all", pingMs: "ms", pingTimeout: "timeout", pingRunning: "...",
    loading: "Loading…",
    copied: "Copied",
    keyPasted: "Key pasted",
    clipboardEmpty: "Clipboard is empty",
    clipboardFail: "Clipboard read failed",
    vpnConnected: "Connected",
    vpnDisconnected: "Disconnected",
    muxOn: "MUX on",
    muxOff: "MUX off",
    muxEnabled: "MUX enabled",
    muxDisabled: "MUX disabled",
    connClosed: "Connection closed",
    bridgeUpdated: "Bridge updated",
    speedUpdated: "Speed updated",
    portUpdated: "Port updated",
    keyRemoved: "Key removed",
    keyInvalidFormat: "Invalid key format",
    encapRemoved: "Encapsulation removed",
    encapApplied: "Encapsulation applied",
    selectTwoConns: "Select two different connections",
    noRecommendation: "No recommendation",
    noActiveConns: "No active connections",
    enterRelayAddr: "Enter relay address",
    enterPeerId: "Enter Peer ID",
    p2pEstablished: "P2P connection established",
    p2pRegistered: "registered",
    p2pInactive: "inactive",
    p2pRelayAddr: "Relay address",
    p2pSecret: "Secret",
    p2pSharedSecret: "shared secret",
    p2pConnectTo: "Connect to",
    p2pRegister: "Register",
    p2pDisconnect: "Disconnect",
    p2pConnectPeer: "Connect to peer",
    p2pCancel: "Cancel",
    p2pCopied: "Copied",
    p2pRelay: "P2P Relay",
    p2pConnected: "connected",
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
    connEncap: "Connection Encapsulation",
    connEncapDesc: "Tunnel one connection inside another — outer masks the inner.",
    connEncapOuter: "Outer",
    connEncapInner: "Inner",
    connNeedTwo: "Need at least 2 connections",
    connCountLabel: "Connections",
    connKeysConfigured: "Keys configured",
    connEncapTitle: "Key Combining",
    connEncapDesc2: "Each extra key creates a separate connection with its own transport.",
    connAdd: "Add",
    connNoActive: "No active connections",
    connKeyEncrypted: "encrypted",
    listView: "List view",
    nodeGraph: "Node graph",
    nodeDragHint: "Drag node by header · Connect: drag right port ○ onto left port ○ of another node",
    portIn: "Input port — drag another node's output here",
    portOut: "Output port — drag onto another node's input",
    nodeServer: "Server",
    nodeEnableDisable: "Enable/Disable",
    nodeDuplicate: "Duplicate connection",
    nodeDup: "Dup",
    nodeUnchain: "Remove encapsulation",
    nodeBridgePlaceholder: "Bridge host:port",
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
    subUpdateFailed: "Update failed",
    secretCopied: "Secret copied",
    updateAvailable: "Already up to date",
    updateCheckFailed: "Update check failed",
    reconnectToApply: "Change will take effect after reconnecting",
    dnsServers: "DNS Servers",
    dnsCommaSep: "Comma-separated, empty = default",
    vpnDns: "Proxy DNS (client)",
    vpnDnsHint: "DNS for the proxy client. 'ISP' = system resolver",
    isp: "ISP",
    bypassRu: "Bypass .ru / .su direct",
    bypassRuHint: "GEOIP Russia + .ru/.su domains go direct, bypassing VPN",
    advanced: "Advanced",
    mitmInspection: "MITM Inspection",
    mitmDesc: "Local TLS intercept. Install CA cert in system trust store (port 10899)",
    spoofIpsHint: "Local IPs for source rotation. Empty = disabled",
    ipSpoofing: "IP Spoofing",
    caCert: "CA Certificate",
    installMitmCa: "Install CA",
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
    bridgesTitle2: "Bridges",
    bridgeRefreshTip: "Refresh",
    bridgePingAllTip: "Ping all",
    bridgeSearchPlaceholder: "Search bridge…",
    bridgesAllTab: "All", bridgeTabWhite: "White", bridgeTabBlocked: "Blocked",
    bridgeLocationMap: "Location map",
    bridgeVersionLabel: "Version",
    bridgeNoConnData: "No connection data",
    logSearchPlaceholder: "Search logs...",
    logAll: "All",
    mlServerStarting: "ML server starting...",
    mlServerStopped: "ML server stopped",
    mlServerRestarted: "ML server restarted",
    mlUnavailable: "ML server unavailable",
    mlInvalidToken: "ML: invalid token — update in settings",
    mlScanFailed: "Scan failed",
    mlModelReloaded: "Model reloaded",
    mlDatasetCaptured: "Dataset captured",
    mlTrainClickHint: "Click to start training",
    vpnConnTransport: "Connected · transport:",
    encapsulatedIn: "encapsulated in",
    transportSet: "Transport →",
    duplicated: "Duplicated",
    duplicatedTo: "Duplicated →",
    keyAdded: "Key added (total",
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
    home: "主页", connections: "连接", profiles: "配置", routing: "路由", logs: "日志", settings: "设置", bridges: "桥接", ml: "ML模式",
    mlTitle: "ML模式", mlStatus: "状态", mlRunning: "运行中", mlStopped: "已停止",
    mlStart: "启动", mlStop: "停止", mlRestart: "重启",
    mlNoBinary: "未找到 whispera-ml-server.exe",
    mlServer: "ML服务器", mlEndpoint: "地址", mlLogs: "日志",
    mlClearLogs: "清空", mlRefreshLogs: "刷新",
    mlFallback: "模式", mlFallbackOn: "回退（内置）", mlFallbackOff: "Go ML 激活",
    mlDesc: "ML实时分析流量并根据当前DPI调整混淆",
    mlNetworkAnalysis: "网络分析", mlRunAnalysis: "分析网络", mlAnalyzing: "分析中...",
    mlDpiRisk: "DPI风险", mlDpiLow: "低", mlDpiMedium: "中", mlDpiHigh: "高", mlDpiCritical: "严重",
    mlAvgRtt: "平均RTT", mlReachable: "可达主机",
    mlTransportRec: "推荐传输", mlTransportDesc: "原因",
    mlScanFirst: "点击「分析网络」获取传输建议",
    mlTraining: "模型训练", mlTrainStart: "开始训练", mlTrainStop: "停止",
    mlTrainRunning: "训练中...", mlTrainEpoch: "轮次", mlTrainLoss: "损失", mlTrainProgress: "进度",
    mlTrainDone: "训练完成", mlTrainFailed: "训练失败",
    mlPortScan: "端口扫描", mlScanStart: "扫描", mlScanRunning: "扫描中...",
    mlScanHost: "主机", mlScanPort: "端口", mlScanService: "服务", mlScanLatency: "延迟",
    mlScanOpen: "开放", mlScanClosed: "关闭", mlScanNoResults: "无结果",
    mlFederated: "联邦学习", mlFedExport: "导出增量", mlFedImport: "导入增量",
    mlFedLosses: "损失指标", mlFedExported: "增量已导出", mlFedImported: "增量已导入",
    mlDatasets: "数据集", mlDsCapture: "捕获", mlDsUpload: "上传", mlDsEmpty: "无数据集", mlDsExport: "导出数据集", mlDsExporting: "导出中...", mlDsAutoExport: "自动导出",
    mlFeedback: "反馈", mlFbSuccess: "成功", mlFbFail: "失败", mlFbTotal: "总计", mlFbLatency: "延迟",
    mlFbNoData: "无数据", mlFbSend: "发送结果",
    mlModelMgmt: "模型管理", mlModelReload: "重新加载模型", mlModelParams: "参数",
    mlModelAccuracy: "准确率", mlModelSamples: "样本", mlModelEngine: "引擎",
    mlTargetServer: "目标服务器", mlTargetServerHint: "host:port，例如 1.2.3.4:8443",
    mlToken: "ML令牌", mlTokenHint: "PSK认证令牌",
    mlConnect: "通过ML连接", mlConnecting: "连接中...", mlDisconnect: "断开",
    mlBridgesRanked: "ML排名的桥接", mlScore: "ML",
    bridgesTitle: "桥接地图", noBridges: "无可用桥接", bridgeConnect: "连接",
    bridgesAlive: "在线", bridgesTotal: "总计", bridgesLatency: "延迟", bridgesRefresh: "刷新",
    bridgesNoKey: "在设置中填写连接密钥以加载桥接",
    bridgesConnecting: "连接桥接中...", bridgesConnected: "桥接密钥已设置",
    bridgesTabAll: "全部", bridgesMLBest: "ML最优", bridgeMLExpertTip: "仅限高级用户：神经网络尚未充分训练，结果可能不准确。",
    bridgesPinging: "正在Ping桥接...", bridgesScanPing: "TCP Ping全部",
    bridgeLoad: "负载", bridgeUsers: "用户", bridgeBW: "带宽", bridgeLocation: "位置",
    bridgeProvider: "提供商", bridgeVersion: "版本", bridgeDist: "距离",
    bridgeSSHTitle: "SSH访问密钥", bridgeSSHUser: "用户ID", bridgeSSHIssue: "颁发密钥",
    bridgeRolloutTitle: "更新推送", bridgeRolloutVer: "版本", bridgeRolloutBtn: "推送",
    bridgeRolloutStarted: "推送已启动...", bridgeRolloutDone: "推送完成",
    bridgesMLNotReady: "ML未就绪或桥接列表为空",
    connection: "连接", noProfile: "无配置", disconnected: "已断开", connected: "已连接",
    keyPlaceholder: "粘贴密钥...", connect: "连接", disconnect: "断开",
    siteCheck: "网站检测", timeout: "超时", ok: "正常", checking: "...",
    ipInfo: "IP信息", ipAddress: "IP地址", location: "位置", provider: "运营商",
    system: "系统", os: "操作系统", uptime: "运行时间", version: "版本", admin: "管理员",
    activeConns: "活跃连接", connectToSee: "连接后查看连接",
    noProfiles: "无保存配置", addProfile: "添加配置",
    systemLog: "系统日志", logReady: "系统就绪，等待日志...",
    mixedPort: "混合端口：", bindAddr: "绑定地址：", tunStack: "Tun堆栈：",
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
    paste: "粘贴", connecting: "连接中...", disconnecting: "断开中...",
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
    noSubscriptions: "无订阅", subKeys: "密钥", subRefreshing: "更新中...",
    subRefresh: "刷新", subDelete: "删除", subLastUpdated: "已更新",
    subSelectKey: "使用密钥", subRename: "重命名",
    pingKey: "延迟", pingAll: "全部延迟", pingMs: "毫秒", pingTimeout: "超时", pingRunning: "...",
    loading: "加载中…",
    copied: "已复制",
    keyPasted: "密钥已粘贴",
    clipboardEmpty: "剪贴板为空",
    clipboardFail: "读取剪贴板失败",
    vpnConnected: "已连接",
    vpnDisconnected: "已断开",
    muxOn: "MUX已开启",
    muxOff: "MUX已关闭",
    muxEnabled: "MUX已开启",
    muxDisabled: "MUX已关闭",
    connClosed: "连接已关闭",
    bridgeUpdated: "桥接已更新",
    speedUpdated: "速度已更新",
    portUpdated: "端口已更新",
    keyRemoved: "密钥已删除",
    keyInvalidFormat: "密钥格式无效",
    encapRemoved: "封装已移除",
    encapApplied: "封装已应用",
    selectTwoConns: "请选择两个不同的连接",
    noRecommendation: "无推荐",
    noActiveConns: "无活跃连接",
    enterRelayAddr: "请输入中继地址",
    enterPeerId: "请输入Peer ID",
    p2pEstablished: "P2P连接已建立",
    p2pRegistered: "已注册",
    p2pInactive: "未激活",
    p2pRelayAddr: "中继地址",
    p2pSecret: "密钥",
    p2pSharedSecret: "共享密钥",
    p2pConnectTo: "连接到",
    p2pRegister: "注册",
    p2pDisconnect: "断开",
    p2pConnectPeer: "连接到节点",
    p2pCancel: "取消",
    p2pCopied: "已复制",
    p2pRelay: "P2P中继",
    p2pConnected: "已连接",
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
    connEncap: "连接封装",
    connEncapDesc: "在另一个连接内隧道一个连接——外层掩盖内层。",
    connEncapOuter: "外层",
    connEncapInner: "内层",
    connNeedTwo: "至少需要2个连接",
    connCountLabel: "连接数",
    connKeysConfigured: "已配置密钥",
    connEncapTitle: "密钥合并",
    connEncapDesc2: "每个额外密钥会创建一个独立传输的单独连接。",
    connAdd: "添加",
    connNoActive: "无活跃连接",
    connKeyEncrypted: "已加密",
    listView: "列表视图",
    nodeGraph: "节点图",
    nodeDragHint: "拖动节点标题 · 连接：将右端口 ○ 拖到另一个节点的左端口 ○",
    portIn: "输入端口 — 将另一个节点的输出拖到这里",
    portOut: "输出端口 — 拖到另一个节点的输入上",
    nodeServer: "服务器",
    nodeEnableDisable: "启用/禁用",
    nodeDuplicate: "复制连接",
    nodeDup: "复制",
    nodeUnchain: "移除封装",
    nodeBridgePlaceholder: "桥接 host:port",
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
    subUpdateFailed: "更新失败",
    secretCopied: "Secret已复制",
    updateAvailable: "已是最新版本",
    updateCheckFailed: "检查更新失败",
    reconnectToApply: "重新连接后更改将生效",
    dnsServers: "DNS服务器",
    dnsCommaSep: "逗号分隔，留空=默认",
    vpnDns: "代理 DNS（客户端）",
    vpnDnsHint: "代理客户端DNS。'运营商'=系统解析器",
    isp: "运营商",
    bypassRu: "直连 .ru / .su 域名",
    bypassRuHint: "俄罗斯IP + .ru/.su域名直连，不走VPN",
    advanced: "高级",
    mitmInspection: "MITM检查",
    mitmDesc: "本地TLS拦截。需要在系统信任存储中安装CA证书（端口10899）",
    spoofIpsHint: "用于源轮换的本地IP列表。留空=禁用",
    ipSpoofing: "IP欺骗",
    caCert: "CA证书",
    installMitmCa: "安装 CA",
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
    bridgesTitle2: "桥接",
    bridgeRefreshTip: "刷新",
    bridgePingAllTip: "Ping全部",
    bridgeSearchPlaceholder: "搜索桥接…",
    bridgesAllTab: "全部", bridgeTabWhite: "白名单", bridgeTabBlocked: "已屏蔽",
    bridgeLocationMap: "位置地图",
    bridgeVersionLabel: "版本",
    bridgeNoConnData: "无连接数据",
    logSearchPlaceholder: "搜索日志...",
    logAll: "全部",
    mlServerStarting: "ML服务器正在启动...",
    mlServerStopped: "ML服务器已停止",
    mlServerRestarted: "ML服务器已重启",
    mlUnavailable: "ML服务器不可用",
    mlInvalidToken: "ML: 令牌无效 — 请在设置中更新",
    mlScanFailed: "扫描失败",
    mlModelReloaded: "模型已重新加载",
    mlDatasetCaptured: "数据集已捕获",
    mlTrainClickHint: "点击开始训练",
    vpnConnTransport: "已连接 · 传输:",
    encapsulatedIn: "封装于",
    transportSet: "传输 →",
    duplicated: "已复制",
    duplicatedTo: "已复制 →",
    keyAdded: "密钥已添加（共",
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
    home: "خانه", connections: "اتصالات", profiles: "پروفایل‌ها", routing: "مسیریابی", logs: "گزارش", settings: "تنظیمات", bridges: "پل‌ها", ml: "حالت ML",
    mlTitle: "حالت ML", mlStatus: "وضعیت", mlRunning: "در حال اجرا", mlStopped: "متوقف",
    mlStart: "شروع", mlStop: "توقف", mlRestart: "راه‌اندازی مجدد",
    mlNoBinary: "فایل whispera-ml-server.exe یافت نشد",
    mlServer: "سرور ML", mlEndpoint: "آدرس", mlLogs: "گزارش‌ها",
    mlClearLogs: "پاک کردن", mlRefreshLogs: "بروزرسانی",
    mlFallback: "حالت", mlFallbackOn: "بازگشتی (داخلی)", mlFallbackOff: "Go ML فعال",
    mlDesc: "ML ترافیک را در زمان واقعی تحلیل کرده و مبهم‌سازی را تنظیم می‌کند",
    mlNetworkAnalysis: "تحلیل شبکه", mlRunAnalysis: "تحلیل شبکه", mlAnalyzing: "در حال تحلیل...",
    mlDpiRisk: "خطر DPI", mlDpiLow: "پایین", mlDpiMedium: "متوسط", mlDpiHigh: "بالا", mlDpiCritical: "بحرانی",
    mlAvgRtt: "میانگین RTT", mlReachable: "هاست‌های قابل دسترس",
    mlTransportRec: "انتقال پیشنهادی", mlTransportDesc: "دلیل",
    mlScanFirst: "روی «تحلیل شبکه» کلیک کنید",
    mlTraining: "آموزش مدل", mlTrainStart: "شروع آموزش", mlTrainStop: "توقف",
    mlTrainRunning: "در حال آموزش...", mlTrainEpoch: "دوره", mlTrainLoss: "خطا", mlTrainProgress: "پیشرفت",
    mlTrainDone: "آموزش تمام شد", mlTrainFailed: "آموزش ناموفق",
    mlPortScan: "اسکن پورت", mlScanStart: "اسکن", mlScanRunning: "در حال اسکن...",
    mlScanHost: "هاست", mlScanPort: "پورت", mlScanService: "سرویس", mlScanLatency: "تأخیر",
    mlScanOpen: "باز", mlScanClosed: "بسته", mlScanNoResults: "بدون نتیجه",
    mlFederated: "یادگیری فدرال", mlFedExport: "صادرات دلتا", mlFedImport: "واردات دلتا",
    mlFedLosses: "معیارهای خطا", mlFedExported: "دلتا صادر شد", mlFedImported: "دلتا وارد شد",
    mlDatasets: "مجموعه داده", mlDsCapture: "ضبط", mlDsUpload: "بارگذاری", mlDsEmpty: "بدون داده", mlDsExport: "صادرات", mlDsExporting: "در حال صادرات...", mlDsAutoExport: "صادرات خودکار",
    mlFeedback: "بازخورد", mlFbSuccess: "موفق", mlFbFail: "ناموفق", mlFbTotal: "جمع", mlFbLatency: "تأخیر",
    mlFbNoData: "بدون داده", mlFbSend: "ارسال نتیجه",
    mlModelMgmt: "مدیریت مدل", mlModelReload: "بارگذاری مجدد", mlModelParams: "پارامترها",
    mlModelAccuracy: "دقت", mlModelSamples: "نمونه‌ها", mlModelEngine: "موتور",
    mlTargetServer: "سرور هدف", mlTargetServerHint: "host:port، مثلاً 1.2.3.4:8443",
    mlToken: "توکن ML", mlTokenHint: "توکن احراز هویت PSK",
    mlConnect: "اتصال از طریق ML", mlConnecting: "در حال اتصال...", mlDisconnect: "قطع اتصال",
    mlBridgesRanked: "پل‌های رتبه‌بندی شده توسط ML", mlScore: "ML",
    bridgesTitle: "نقشه پل‌ها", noBridges: "پل‌ موجود نیست", bridgeConnect: "اتصال",
    bridgesAlive: "فعال", bridgesTotal: "کل", bridgesLatency: "پینگ", bridgesRefresh: "بروزرسانی",
    bridgesNoKey: "برای بارگذاری پل‌ها، کلید اتصال را در تنظیمات وارد کنید",
    bridgesConnecting: "در حال اتصال به پل...", bridgesConnected: "کلید پل تنظیم شد",
    bridgesTabAll: "همه", bridgesMLBest: "بهترین ML", bridgeMLExpertTip: "فقط برای کاربران پیشرفته: شبکه عصبی هنوز به خوبی آموزش ندیده است.",
    bridgesPinging: "در حال پینگ پل‌ها...", bridgesScanPing: "پینگ TCP همه",
    bridgeLoad: "بار", bridgeUsers: "کاربران", bridgeBW: "پهنای باند", bridgeLocation: "موقعیت",
    bridgeProvider: "ارائه‌دهنده", bridgeVersion: "نسخه", bridgeDist: "فاصله",
    bridgeSSHTitle: "کلید دسترسی SSH", bridgeSSHUser: "شناسه کاربر", bridgeSSHIssue: "صدور کلید",
    bridgeRolloutTitle: "راه‌اندازی به‌روزرسانی", bridgeRolloutVer: "نسخه", bridgeRolloutBtn: "راه‌اندازی",
    bridgeRolloutStarted: "راه‌اندازی شروع شد...", bridgeRolloutDone: "راه‌اندازی کامل شد",
    bridgesMLNotReady: "ML آماده نیست یا لیست پل‌ها خالی است",
    connection: "اتصال", noProfile: "بدون پروفایل", disconnected: "قطع شده", connected: "متصل",
    keyPlaceholder: "کلید را وارد کنید...", connect: "اتصال", disconnect: "قطع",
    siteCheck: "بررسی سایت", timeout: "تایم‌اوت", ok: "خوب", checking: "...",
    ipInfo: "اطلاعات IP", ipAddress: "آدرس IP", location: "موقعیت", provider: "ارائه‌دهنده",
    system: "سیستم", os: "سیستم‌عامل", uptime: "مدت اجرا", version: "نسخه", admin: "مدیر",
    activeConns: "اتصالات فعال", connectToSee: "برای مشاهده متصل شوید",
    noProfiles: "پروفایلی ذخیره نشده", addProfile: "افزودن پروفایل",
    systemLog: "گزارش سیستم", logReady: "سیستم آماده است. منتظر گزارش...",
    mixedPort: "پورت ترکیبی:", bindAddr: "آدرس bind:", tunStack: "Tun Stack:",
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
    paste: "چسباندن", connecting: "در حال اتصال...", disconnecting: "در حال قطع...",
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
    noSubscriptions: "اشتراکی وجود ندارد", subKeys: "کلیدها", subRefreshing: "در حال بروزرسانی...",
    subRefresh: "بروزرسانی", subDelete: "حذف", subLastUpdated: "بروزرسانی شده",
    subSelectKey: "استفاده از کلید", subRename: "تغییر نام",
    pingKey: "پینگ", pingAll: "پینگ همه", pingMs: "میلی‌ثانیه", pingTimeout: "تایم‌اوت", pingRunning: "...",
    loading: "در حال بارگذاری…",
    copied: "کپی شد",
    keyPasted: "کلید وارد شد",
    clipboardEmpty: "کلیپ‌بورد خالی است",
    clipboardFail: "خواندن کلیپ‌بورد ناموفق",
    vpnConnected: "متصل شد",
    vpnDisconnected: "قطع شد",
    muxOn: "MUX روشن شد",
    muxOff: "MUX خاموش شد",
    muxEnabled: "MUX فعال شد",
    muxDisabled: "MUX غیرفعال شد",
    connClosed: "اتصال بسته شد",
    bridgeUpdated: "پل به‌روز شد",
    speedUpdated: "سرعت به‌روز شد",
    portUpdated: "پورت به‌روز شد",
    keyRemoved: "کلید حذف شد",
    keyInvalidFormat: "فرمت کلید نامعتبر است",
    encapRemoved: "کپسوله‌سازی حذف شد",
    encapApplied: "کپسوله‌سازی اعمال شد",
    selectTwoConns: "دو اتصال متفاوت انتخاب کنید",
    noRecommendation: "توصیه‌ای وجود ندارد",
    noActiveConns: "اتصال فعالی وجود ندارد",
    enterRelayAddr: "آدرس رله را وارد کنید",
    enterPeerId: "Peer ID را وارد کنید",
    p2pEstablished: "اتصال P2P برقرار شد",
    p2pRegistered: "ثبت‌نام شده",
    p2pInactive: "غیرفعال",
    p2pRelayAddr: "آدرس رله",
    p2pSecret: "رمز",
    p2pSharedSecret: "رمز مشترک",
    p2pConnectTo: "اتصال به",
    p2pRegister: "ثبت‌نام",
    p2pDisconnect: "قطع اتصال",
    p2pConnectPeer: "اتصال به همتا",
    p2pCancel: "لغو",
    p2pCopied: "کپی شد",
    p2pRelay: "رله P2P",
    p2pConnected: "متصل",
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
    connEncap: "کپسوله‌سازی اتصال",
    connEncapDesc: "یک اتصال را درون اتصال دیگری تونل می‌کند — بیرونی داخلی را پنهان می‌کند.",
    connEncapOuter: "بیرونی",
    connEncapInner: "داخلی",
    connNeedTwo: "حداقل ۲ اتصال لازم است",
    connCountLabel: "تعداد اتصالات",
    connKeysConfigured: "کلیدهای پیکربندی‌شده",
    connEncapTitle: "ترکیب کلیدها",
    connEncapDesc2: "هر کلید اضافی یک اتصال جداگانه با انتقال مستقل ایجاد می‌کند.",
    connAdd: "افزودن",
    connNoActive: "اتصال فعالی وجود ندارد",
    connKeyEncrypted: "رمزنگاری شده",
    listView: "نمای لیست",
    nodeGraph: "نمودار گره",
    nodeDragHint: "گره را از عنوان بکشید · اتصال: پورت راست ○ را روی پورت چپ ○ گره دیگری بکشید",
    portIn: "پورت ورودی — خروجی گره دیگری را اینجا بکشید",
    portOut: "پورت خروجی — روی ورودی گره دیگری بکشید",
    nodeServer: "سرور",
    nodeEnableDisable: "روشن/خاموش",
    nodeDuplicate: "تکرار اتصال",
    nodeDup: "تکرار",
    nodeUnchain: "حذف کپسوله‌سازی",
    nodeBridgePlaceholder: "پل host:port",
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
    subUpdateFailed: "به‌روزرسانی ناموفق",
    secretCopied: "Secret کپی شد",
    updateAvailable: "نسخه به‌روز نصب است",
    updateCheckFailed: "بررسی به‌روزرسانی ناموفق",
    reconnectToApply: "تغییر پس از اتصال مجدد اعمال خواهد شد",
    dnsServers: "سرورهای DNS",
    dnsCommaSep: "جداشده با کاما، خالی = پیش‌فرض",
    vpnDns: "Proxy DNS (کلاینت)",
    vpnDnsHint: "DNS برای کلاینت پراکسی. 'ISP' = رزولور سیستم",
    isp: "ISP",
    bypassRu: "دور زدن .ru / .su مستقیم",
    bypassRuHint: "دامنه‌های روسی و GEOIP Russia مستقیم، بدون VPN",
    advanced: "پیشرفته",
    mitmInspection: "بازرسی MITM",
    mitmDesc: "رهگیری TLS محلی. نیاز به نصب گواهی CA در سیستم دارد (پورت 10899)",
    spoofIpsHint: "لیست IP‌های محلی برای چرخش منبع. خالی = غیرفعال",
    ipSpoofing: "جعل IP",
    caCert: "گواهی CA",
    installMitmCa: "نصب CA",
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
    bridgesTitle2: "پل‌ها",
    bridgeRefreshTip: "بروزرسانی",
    bridgePingAllTip: "پینگ همه",
    bridgeSearchPlaceholder: "جستجوی پل…",
    bridgesAllTab: "همه", bridgeTabWhite: "سفید", bridgeTabBlocked: "مسدود",
    bridgeLocationMap: "نقشه موقعیت",
    bridgeVersionLabel: "نسخه",
    bridgeNoConnData: "داده اتصال وجود ندارد",
    logSearchPlaceholder: "جستجو در گزارش‌ها...",
    logAll: "همه",
    mlServerStarting: "سرور ML در حال راه‌اندازی...",
    mlServerStopped: "سرور ML متوقف شد",
    mlServerRestarted: "سرور ML راه‌اندازی مجدد شد",
    mlUnavailable: "سرور ML در دسترس نیست",
    mlInvalidToken: "ML: توکن نامعتبر — در تنظیمات به‌روز کنید",
    mlScanFailed: "اسکن ناموفق",
    mlModelReloaded: "مدل مجدداً بارگذاری شد",
    mlDatasetCaptured: "مجموعه داده ضبط شد",
    mlTrainClickHint: "برای شروع آموزش کلیک کنید",
    vpnConnTransport: "متصل شد · انتقال:",
    encapsulatedIn: "کپسوله شده در",
    transportSet: "انتقال →",
    duplicated: "کپی شد",
    duplicatedTo: "کپی شد →",
    keyAdded: "کلید اضافه شد (جمع",
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

interface ConnectionEntry {
  id: string;
  transport: string;
  server: string;
  status: "connecting" | "connected" | "disconnected" | "failed";
  enabled: boolean;
  obfuscated: boolean;
  mux: boolean;
  rate_limit_kb: number;
  sni: string;
  bridge: string;
  bytes_up: number;
  bytes_down: number;
  connected_at?: string;
  error?: string;
  encapsulated_in?: string;
  force_obfuscation: boolean;
  behavioral_profile?: string;
  key_index?: number; // set by Tauri for extra-key connections (0-based)
}

let connectionsList: ConnectionEntry[] = [];
let connectionsExpanded: Set<string> = new Set();

// Node-граф: состояние
let nodeViewActive: boolean = localStorage.getItem("whispera_ng_view") !== "0";
const nodePositions = new Map<string, { x: number; y: number }>();
let ngPortDrag: { srcId: string; sx: number; sy: number; ex: number; ey: number } | null = null;

function loadNodePositions(): void {
  try {
    const raw = localStorage.getItem("whispera_node_pos");
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, { x: number; y: number }>;
      Object.entries(obj).forEach(([id, pos]) => nodePositions.set(id, pos));
    }
  } catch { /**/ }
}
loadNodePositions();

function saveNodePositions(): void {
  const obj: Record<string, { x: number; y: number }> = {};
  nodePositions.forEach((pos, id) => { obj[id] = pos; });
  localStorage.setItem("whispera_node_pos", JSON.stringify(obj));
}

function getNodePos(id: string, idx: number): { x: number; y: number } {
  if (nodePositions.has(id)) return nodePositions.get(id)!;
  const col = idx % 3;
  const row = Math.floor(idx / 3);
  return { x: 20 + col * 270, y: 20 + row * 240 };
}

const isAndroid = /android/i.test(navigator.userAgent);

let settings: AppSettings = {
  conn_key: "", auto_connect: false, theme: "dark", mihomo_port: 9887,
  socks_addr: "127.0.0.1", kill_switch: false, dns_redirect: false,
  ipv6: true, tun_stack: "Mixed", hwid: true, auth_tip: true, secret: "",
};

let profiles: Profile[] = [];
let subscriptions: Subscription[] = [];
let pingResults: Map<string, number | "pinging" | "timeout"> = new Map();
let subUpdateAvailable: Set<string> = new Set();
let subAutoCheckTimer: ReturnType<typeof setInterval> | null = null;
let routingRules: RoutingRule[] = [];
let blocklistRules: RoutingRule[] = [];
let multiBridges: MultiBridgeEntry[] = [];
let bridgeList: BridgeInfo[] = [];
let currentFingerprint = localStorage.getItem("tls_fingerprint") || "chrome";
let logLines: string[] = [];
let connectTime: number | null = null;
let ipInfo = { ip: "—", location: "—", provider: "—" };
let sysInfo = { os: "—", uptime: "—", version: "v0.1.4", admin: false };

const sites: SiteCheck[] = [
  { name: "Google",    letter: "G",  cssClass: "google",    url: "https://google.com",    status: "checking", ping: 0 },
  { name: "YouTube",   letter: "Y",  cssClass: "youtube",   url: "https://youtube.com",   status: "checking", ping: 0 },
  { name: "GitHub",    letter: "H",  cssClass: "github",    url: "https://github.com",    status: "checking", ping: 0 },
  { name: "Twitter",   letter: "X",  cssClass: "twitter",   url: "https://twitter.com",   status: "checking", ping: 0 },
  { name: "Spotify",   letter: "S",  cssClass: "spotify",   url: "https://spotify.com",   status: "checking", ping: 0 },
  { name: "Instagram", letter: "In", cssClass: "instagram", url: "https://instagram.com", status: "checking", ping: 0 },
  { name: "Facebook",  letter: "F",  cssClass: "facebook",  url: "https://facebook.com",  status: "checking", ping: 0 },
  { name: "Discord",   letter: "D",  cssClass: "discord",   url: "https://discord.com",   status: "checking", ping: 0 },
  { name: "Reddit",    letter: "R",  cssClass: "reddit",    url: "https://reddit.com",    status: "checking", ping: 0 },
  { name: "Netflix",   letter: "N",  cssClass: "netflix",   url: "https://netflix.com",   status: "checking", ping: 0 },
];

function t(key: string): string { return i18n[lang][key] || key; }


function getServerBaseURL(): string {
  const key = settings.conn_key.trim();
  if (!key) return "";
  if (key.startsWith("whispera://")) {
    // Try base64-JSON format: whispera://<base64({server:"host:port",...})>
    try {
      const raw = key.slice("whispera://".length).split("?")[0];
      const decoded = atob(raw);
      const j = JSON.parse(decoded) as Record<string, unknown>;
      const srv = (j.server as string) || "";
      if (srv) {
        const parts = srv.split(":");
        const host = parts[0];
        const port = parts[1] || "8443";
        return `https://${host}:${port}`;
      }
    } catch { /* not base64 JSON */ }
    // Legacy format: whispera://host:port?params
    try {
      const u = new URL(key);
      const host = u.hostname;
      if (!host || host.includes("=") || (host.length > 40 && !host.includes("."))) return "";
      const scheme = u.port === "443" || u.port === "" ? "https" : "http";
      return `${scheme}://${u.host}`;
    } catch { return ""; }
  }
  return "";
}

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
  for (const sub of subscriptions) {
    try {
      const remote = await invoke<Subscription>("check_subscription_update", { id: sub.id });
      if (remote && remote.updated !== sub.updated) {
        subUpdateAvailable.add(sub.id);
      }
    } catch {/**/}
  }
  if (subUpdateAvailable.size > 0 && currentPage === "profiles") renderPage();
}

function startSubAutoCheck(): void {
  if (subAutoCheckTimer) clearInterval(subAutoCheckTimer);
  subAutoCheckTimer = setInterval(() => autoCheckSubscriptions(), 10 * 60 * 1000);
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

let _appliedMlTransport = "";
let _mlEnabledInKey = false; // tracks whether user toggled "Enable ML" checkbox on home page

interface AgentArm {
  name: string;
  attempts: number;
  successes: number;
  q_value: number;
  avg_ms: number;
  streak: number;
  last_ok: boolean;
}
interface AgentStats {
  state: number | string;
  current_arm: number;
  total_probes: number;
  total_rotations: number;
  arms: AgentArm[];
  consec_fails: number;
}
let _agentStats: AgentStats | null = null;

async function fetchAgentStats(): Promise<void> {
  try {
    _agentStats = await invoke<AgentStats>("get_agent_stats");
  } catch { _agentStats = null; }
}

interface P2PStatus {
  registered: boolean;
  connected: boolean;
  relay_addr: string;
  peer_id: string;
}
let _p2pStatus: P2PStatus = { registered: false, connected: false, relay_addr: "", peer_id: "" };

async function fetchP2PStatus(): Promise<void> {
  try { _p2pStatus = await invoke<P2PStatus>("p2p_status"); } catch { /* control server not up */ }
}

async function doConnect(): Promise<void> {
  isConnecting = true;
  if (currentPage === "home") renderPage();
  try {
    const msg = await invoke<string>("connect");
    isConnected = true;
    connectTime = Date.now();
    addLog("✓ " + msg);
    playConnectSound();
    try { _appliedMlTransport = await invoke<string>("get_ml_transport"); } catch { _appliedMlTransport = ""; }
    const transportMsg = _appliedMlTransport
      ? `${t("vpnConnTransport")} ${_appliedMlTransport}`
      : t("vpnConnected");
    showToast(transportMsg, "success", 4000);

    // Auto-start ML server if key contains ml=enabled
    try {
      const keyStr = settings.conn_key.trim();
      if (keyStr.startsWith("whispera://")) {
        const keyUrl = new URL(keyStr);
        if (keyUrl.searchParams.get("ml") === "enabled") {
          const keyMlToken = keyUrl.searchParams.get("ml_token");
          if (keyMlToken && keyMlToken !== _mlToken) {
            _mlToken = keyMlToken;
            _mlTokenInvalid = false;
            localStorage.setItem("ml_token", _mlToken);
          }
          if (!_mlStatus && _mlBinaryExists) {
            await invoke("start_ml_server");
            addLog("✓ ML auto-started from key");
          }
        }
      }
    } catch { /**/ }
  } catch (e) {
    addLog("✗ " + e);
    showToast(String(e), "error", 5000);
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
    addLog("○ " + msg);
    showToast(t("vpnDisconnected"), "info");
  } catch (e) {
    addLog("✗ " + e);
    showToast(String(e), "error", 5000);
  }
  isConnecting = false;
  if (currentPage === "home") renderPage();
}

async function checkStatus(): Promise<void> {
  try {
    const was = isConnected;
    isConnected = await invoke<boolean>("get_status");
    if (isConnected && !was && connectTime === null) connectTime = Date.now();
  } catch {/**/ }
}

/* Site checks — update DOM in-place, no flicker */
async function checkSites(): Promise<void> {
  for (const site of sites) {
    site.status = "checking";
    site.ping = 0;
    updateSiteDOM(site);
  }
  for (const site of sites) {
    try {
      const result = await invoke<{ status: number; ping_ms: number }>("check_site", { url: site.url });
      site.status = result.status < 400 ? "ok" : "timeout";
      site.ping = result.ping_ms;
    } catch {
      site.status = "timeout";
      site.ping = 0;
    }
    updateSiteDOM(site);
  }
}

function updateSiteDOM(site: SiteCheck): void {
  const el = document.getElementById("site-" + site.name);
  if (!el) return;
  const statusEl = el.querySelector(".site-status");
  if (!statusEl) return;
  statusEl.className = "site-status " + site.status;
  if (site.status === "ok") {
    statusEl.textContent = site.ping + "ms";
  } else if (site.status === "timeout") {
    statusEl.textContent = t("timeout");
  } else {
    statusEl.textContent = "...";
  }
}

async function fetchIpInfo(): Promise<void> {
  try {
    const info = await invoke<{ ip: string; city: string; region: string; country: string; org: string; loc: string }>("get_ip_info");
    ipInfo = { ip: info.ip || "—", location: (info.city || "—") + ", " + (info.country || ""), provider: info.org || "—" };
    if (info.loc) {
      const parts = info.loc.split(",");
      if (parts.length === 2) {
        userLat = parseFloat(parts[0]);
        userLon = parseFloat(parts[1]);
      }
    }
  } catch { ipInfo = { ip: "—", location: "—", provider: "—" }; }
  updateIPDOM();
}

function updateIPDOM(): void {
  const el = document.getElementById("ip-val");
  const loc = document.getElementById("loc-val");
  const prov = document.getElementById("prov-val");
  if (el) el.innerHTML = `${esc(ipInfo.ip)} <span class="copy-icon" data-copy="${esc(ipInfo.ip)}">${ICONS.copy}</span>`;
  if (loc) loc.textContent = ipInfo.location;
  if (prov) prov.textContent = ipInfo.provider;
}

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
    if (logFilter !== "all") {
      const level = logFilter.toUpperCase();
      if (!l.toUpperCase().includes(`[${level}]`) && !l.toUpperCase().includes(`"level":"${level}"`)) return false;
    }
    if (logSearch && !l.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });
  const colorized = filtered.map(l => {
    let cls = "log-line";
    const u = l.toUpperCase();
    if (u.includes("[ERROR]") || u.includes('"level":"error"')) cls += " log-error";
    else if (u.includes("[WARN]") || u.includes('"level":"warn"')) cls += " log-warn";
    else if (u.includes("[INFO]") || u.includes('"level":"info"')) cls += " log-info";
    else if (u.includes("[DEBUG]") || u.includes('"level":"debug"')) cls += " log-debug";
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
    { id: "connections", icon: ICONS.wifi,     label: t("connections") },
    { id: "profiles",   icon: ICONS.user,     label: t("profiles") },
    { id: "routing",    icon: routeIcon,      label: t("routing") },
    { id: "bridges",    icon: ICONS.globe,    label: t("bridges") },
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
    case "home": main.innerHTML = renderHome(); bindHomeEvents(); break;
    case "connections":
      main.innerHTML = `<div style="padding:32px;text-align:center;opacity:.5">${t("loading")}</div>`;
      Promise.all([fetchConnections(), fetchAgentStats(), fetchP2PStatus()]).then(() => {
        main.innerHTML = renderConnections();
        bindConnectionsEvents();
      });
      break;
    case "profiles": main.innerHTML = renderProfiles(); bindProfileEvents(); break;
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
    case "bridges": main.innerHTML = renderBridges(); bindBridgesEvents(); break;
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
  renderPage();
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

  let connectionCard: string;
  if (isConnected) {
    connectionCard = `
      <div class="card card-connection">
        <div class="card-header">
          <span class="card-title">${t("connection")}</span>
          <span class="card-title-right">${profileName || t("noProfile")}</span>
        </div>
        <div class="status-line">
          <span class="status-dot on"></span>
          <span class="status-text">${t("connected")}</span>
          <span class="status-uptime" id="status-uptime">${uptimeStr}</span>
        </div>
        ${serverHost ? `<div class="info-row conn-server-row"><span class="info-label">${t("server")}</span><span class="info-value">${esc(serverHost)}</span></div>` : ""}
        ${_appliedMlTransport ? `<div class="info-row"><span class="info-label">ML транспорт</span><span class="info-value"><span class="badge-on">${esc(_appliedMlTransport)}</span></span></div>` : ""}
        <div class="ks-row">
          <span class="ks-label">${t("killSwitch")}</span>
          <span class="${settings.kill_switch ? "badge-on" : "badge-off"}">${settings.kill_switch ? "ON" : "OFF"}</span>
        </div>
        <button class="btn-connect connected" id="btn-connect">${ICONS.x} ${t("disconnect")}</button>
      </div>`;
  } else {
    const dis = isConnecting;
    connectionCard = `
      <div class="card card-connection">
        <div class="card-header">
          <span class="card-title">${t("connection")}</span>
          <span class="card-title-right">${profileName || t("noProfile")}</span>
        </div>
        <div class="status-line">
          <span class="status-dot ${dis ? "connecting" : "off"}"></span>
          <span class="status-text">${dis ? t("connecting") : t("disconnected")}</span>
        </div>
        <div class="key-area">
          <textarea class="key-input" id="conn-key" rows="2" placeholder="${t("keyPlaceholder")}"${dis ? " disabled" : ""}>${esc(settings.conn_key)}</textarea>
          <div class="key-footer">
            <span class="key-hint">Ctrl+Enter</span>
            <button class="paste-btn" id="btn-paste"${dis ? " disabled" : ""}>${t("paste")}</button>
          </div>
        </div>
        <div class="ks-row">
          <span class="ks-label">Enable ML</span>
          <label class="toggle"><input type="checkbox" id="ml-enable-key" ${_mlEnabledInKey ? "checked" : ""}${dis ? " disabled" : ""}/><span class="toggle-slider"></span></label>
        </div>
        <div class="ks-row">
          <span class="ks-label">${t("killSwitch")}</span>
          <label class="toggle"><input type="checkbox" id="ks-home" ${settings.kill_switch ? "checked" : ""}${dis ? " disabled" : ""}/><span class="toggle-slider"></span></label>
        </div>
        <button class="btn-connect${dis ? " connecting" : ""}" id="btn-connect"${dis ? " disabled" : ""}>${dis ? t("connecting") : t("connect")}</button>
      </div>`;
  }

  return `<div class="home-grid">
    ${connectionCard}

    <div class="card card-sites">
      <div class="card-header">
        <span class="card-title">${t("siteCheck")}</span>
        <button class="refresh-btn" id="btn-refresh-sites">${ICONS.refresh}</button>
      </div>
      <div class="sites-grid">
        ${sites.map(s => `<div class="site-item" id="site-${s.name}">
          <div class="site-icon ${s.cssClass}">${s.letter}</div>
          <span class="site-name">${s.name}</span>
          <span class="site-status ${s.status}">${s.status === "ok" ? s.ping + "ms" : s.status === "timeout" ? t("timeout") : "..."}</span>
        </div>`).join("")}
      </div>
    </div>

    <div class="card card-ip">
      <div class="card-header"><span class="card-title">${t("ipInfo")}</span><button class="refresh-btn" id="btn-refresh-ip">${ICONS.refresh}</button></div>
      <div class="info-row"><span class="info-label">${t("ipAddress")}</span><span class="info-value" id="ip-val">${ipInfo.ip} <span class="copy-icon" data-copy="${ipInfo.ip}">${ICONS.copy}</span></span></div>
      <div class="info-row"><span class="info-label">${t("location")}</span><span class="info-value" id="loc-val">${ipInfo.location}</span></div>
      <div class="info-row"><span class="info-label">${t("provider")}</span><span class="info-value" id="prov-val">${ipInfo.provider}</span></div>
    </div>

    <div class="card card-system">
      <div class="card-header"><span class="card-title">${t("system")}</span></div>
      <div class="info-row"><span class="info-label">${t("os")}</span><span class="info-value" id="sys-os">${sysInfo.os}</span></div>
      <div class="info-row"><span class="info-label">${t("uptime")}</span><span class="info-value" id="sys-uptime">${sysInfo.uptime}</span></div>
      <div class="info-row"><span class="info-label">${t("version")}</span><span class="info-value" id="sys-ver">${sysInfo.version}</span></div>
      <div class="info-row"><span class="info-label">${t("admin")}</span><span class="info-value ${sysInfo.admin ? "badge-on" : "badge-off"}" id="sys-admin">${sysInfo.admin ? "ON" : "OFF"}</span></div>
    </div>
  </div>
  ${renderMLSection()}`;
}

function bindHomeEvents(): void {
  document.getElementById("btn-connect")?.addEventListener("click", async () => {
    if (isConnecting) return;
    if (!isConnected) {
      const k = document.getElementById("conn-key") as HTMLTextAreaElement | null;
      if (k) { settings.conn_key = k.value.trim(); await persistSettings(); }
    }
    isConnected ? await doDisconnect() : await doConnect();
  });

  document.getElementById("btn-paste")?.addEventListener("click", async () => {
    try {
      const text = await clipboardRead();
      const ta = document.getElementById("conn-key") as HTMLTextAreaElement | null;
      if (ta && text && text.trim()) {
        ta.value = text.trim();
        ta.focus();
        showToast(t("keyPasted"), "success", 2000);
      } else {
        showToast(t("clipboardEmpty"), "info", 2000);
      }
    } catch {
      showToast(t("clipboardFail"), "error", 2500);
    }
  });

  document.getElementById("conn-key")?.addEventListener("keydown", async (ev) => {
    const e = ev as KeyboardEvent;
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      if (isConnecting || isConnected) return;
      const ta = ev.target as HTMLTextAreaElement;
      settings.conn_key = ta.value.trim();
      await persistSettings();
      await doConnect();
    }
  });

  document.getElementById("ks-home")?.addEventListener("change", function () {
    settings.kill_switch = (this as HTMLInputElement).checked;
    persistSettings();
  });

  document.getElementById("btn-refresh-sites")?.addEventListener("click", () => checkSites());
  document.getElementById("btn-refresh-ip")?.addEventListener("click", () => fetchIpInfo());

  // ML Enable checkbox: append/remove ml=enabled from key
  document.getElementById("ml-enable-key")?.addEventListener("change", function () {
    _mlEnabledInKey = (this as HTMLInputElement).checked;
    const ta = document.getElementById("conn-key") as HTMLTextAreaElement | null;
    if (!ta) return;
    let keyStr = ta.value.trim();
    if (!keyStr.startsWith("whispera://")) return;
    try {
      const u = new URL(keyStr);
      if (_mlEnabledInKey) {
        u.searchParams.set("ml", "enabled");
        if (_mlToken) u.searchParams.set("ml_token", _mlToken);
      } else {
        u.searchParams.delete("ml");
        u.searchParams.delete("ml_token");
      }
      ta.value = u.toString();
      settings.conn_key = ta.value;
      persistSettings();
    } catch { /**/ }
  });

  bindMLSectionEvents();
}

async function fetchConnections(): Promise<void> {
  try {
    const list = await invoke<ConnectionEntry[]>("get_connections");
    connectionsList = list || [];
  } catch {
    connectionsList = [];
  }
}

function fmtBytes(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + " MB";
  return (b / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

const TRANSPORTS = ["tcp","udp","websocket","quic","h2c","obfs4","shadowsocks","shadowtls","tuic",
  "meek","snowflake","domainfront","splithttp","httpupgrade","tgbot","vkwebrtc","vkbot","okwebrtc",
  "yacloud","yadisk","yatelemost","mirage","mtproto"];

function marionetteProfileOpts(current?: string): string {
  const profiles = [
    { value: "",              label: t("profileNone") },
    { value: "telegram",      label: "Telegram (Android)" },
    { value: "telegram_ios",  label: "Telegram (iOS)" },
    { value: "vk",            label: "VK Messenger (Android)" },
    { value: "vk_ios",        label: "VK Messenger (iOS)" },
    { value: "vkvideo",       label: "VK Video" },
    { value: "instagram",     label: "Instagram (Android)" },
    { value: "instagram_ios", label: "Instagram (iOS)" },
    { value: "facebook",      label: "Facebook Messenger (Android)" },
    { value: "facebook_ios",  label: "Facebook Messenger (iOS)" },
    { value: "wechat",        label: "WeChat (Android)" },
    { value: "wechat_ios",    label: "WeChat (iOS)" },
    { value: "max",           label: "MAX / Mail.ru" },
    // Music streaming
    { value: "",              label: t("profileMusicSep"), disabled: true },
    { value: "spotify",       label: "Spotify" },
    { value: "yandex_music",  label: "Yandex Music" },
    { value: "vk_music",      label: "VK Music" },
    // Video streaming
    { value: "",              label: t("profileVideoSep"), disabled: true },
    { value: "youtube",       label: "YouTube" },
    { value: "vk_video_stream", label: "VK Video Stream" },
  ];
  return profiles.map(p =>
    p.disabled
      ? `<option disabled>${p.label}</option>`
      : `<option value="${p.value}" ${(current ?? "") === p.value ? "selected" : ""}>${p.label}</option>`
  ).join("");
}

function renderConnectionCard(c: ConnectionEntry): string {
  const stCls = c.status === "connected" ? "badge-on" : c.status === "failed" ? "badge-off" : "badge-idle";
  const stTxt = c.status === "connected" ? t("connStatusActive")
    : c.status === "connecting" ? t("connStatusConnecting")
    : c.status === "failed" ? t("connStatusFailed")
    : t("connStatusOff");
  const expanded = connectionsExpanded.has(c.id);
  const transportOpts = TRANSPORTS.map(tr =>
    `<option value="${tr}" ${c.transport === tr ? "selected" : ""}>${tr}</option>`
  ).join("");

  const speedBadge = c.rate_limit_kb > 0
    ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(250,204,21,0.12);color:#fde047">⚡${c.rate_limit_kb}KB/s</span>`
    : "";
  const sniBadge = c.sni
    ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(99,102,241,0.12);color:#a5b4fc" title="SNI: ${esc(c.sni)}">SNI</span>`
    : "";
  const bridgeBadge = c.bridge
    ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(34,197,94,0.12);color:#86efac" title="${esc(c.bridge)}">⇒bridge</span>`
    : "";

  return `
  <div class="card conn-entry" data-id="${esc(c.id)}" style="margin-bottom:8px">
    <div class="card-header" style="cursor:pointer" data-expand="${esc(c.id)}">
      <span class="card-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span class="${stCls}" style="font-size:11px;padding:2px 7px">${stTxt}</span>
        <select class="conn-transport-inline input-sm" data-id="${esc(c.id)}"
          onclick="event.stopPropagation()"
          style="font-size:12px;font-weight:600;background:transparent;border:1px solid var(--border);border-radius:4px;padding:1px 4px;color:inherit;max-width:130px">
          ${transportOpts}
        </select>
        <span style="opacity:.55;font-size:12px">${esc(c.server)}</span>
        ${c.key_index !== undefined ? `<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:var(--accent-muted,#3d3d6b);color:var(--accent,#a78bfa)">key ${c.key_index + 1}</span>` : ""}
        ${speedBadge}${sniBadge}${bridgeBadge}
      </span>
      <span style="display:flex;align-items:center;gap:8px">
        <label class="toggle" onclick="event.stopPropagation()">
          <input type="checkbox" class="conn-toggle" data-id="${esc(c.id)}" ${c.enabled ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </label>
        <span style="opacity:.4;font-size:13px">${expanded ? "▲" : "▼"}</span>
      </span>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;gap:8px">
      <div style="display:flex;gap:10px">
        <span class="info-label">↑ ${fmtBytes(c.bytes_up)}</span>
        <span class="info-value">↓ ${fmtBytes(c.bytes_down)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;opacity:.7;cursor:pointer" title="${t("connMuxTitle")}" onclick="event.stopPropagation()">
          <input type="checkbox" class="conn-mux-quick" data-id="${esc(c.id)}" ${c.mux ? "checked" : ""} style="accent-color:var(--accent,#a78bfa)">
          MUX
        </label>
        <button class="btn-sm conn-duplicate-quick" data-id="${esc(c.id)}" onclick="event.stopPropagation()"
          style="font-size:11px;padding:1px 7px" title="${t("connDuplicate")}">⊕</button>
        <button class="btn-sm btn-danger conn-close-quick" data-id="${esc(c.id)}" onclick="event.stopPropagation()"
          style="font-size:11px;padding:1px 7px" title="${t("connClose")}">✕</button>
      </div>
    </div>

    ${expanded ? `
    <div class="conn-details" style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">
      <div class="info-row" style="align-items:center;margin-bottom:6px">
        <span class="info-label" style="min-width:90px">SNI</span>
        <input class="conn-sni input-sm" data-id="${esc(c.id)}" value="${esc(c.sni)}" placeholder="cloudflare.com" style="flex:1">
        <button class="btn-sm btn-apply conn-sni-apply" data-id="${esc(c.id)}" style="margin-left:6px">${t("connApply")}</button>
      </div>

      <div class="info-row" style="align-items:center;margin-bottom:6px">
        <span class="info-label" style="min-width:90px">${t("connPort")}</span>
        <input class="conn-port input-sm" data-id="${esc(c.id)}" value="${esc(c.server.includes(":") ? c.server.split(":").pop()! : "")}" placeholder="443" style="flex:1;max-width:100px">
        <button class="btn-sm btn-apply conn-port-apply" data-id="${esc(c.id)}" style="margin-left:6px">${t("connApply")}</button>
      </div>

      <div class="info-row" style="align-items:center;margin-bottom:6px">
        <span class="info-label" style="min-width:90px">${t("connBridge")}</span>
        <input class="conn-bridge input-sm" data-id="${esc(c.id)}" value="${esc(c.bridge)}" placeholder="host:port" style="flex:1">
        <button class="btn-sm btn-apply conn-bridge-apply" data-id="${esc(c.id)}" style="margin-left:6px">${t("connApply")}</button>
      </div>

      <div class="info-row" style="align-items:center;margin-bottom:6px">
        <span class="info-label" style="min-width:90px">${t("connSpeed")}</span>
        <input class="conn-speed input-sm" data-id="${esc(c.id)}" type="number" min="0" value="${c.rate_limit_kb}" placeholder="0 = нет лимита" style="flex:1;max-width:100px">
        <button class="btn-sm btn-apply conn-speed-apply" data-id="${esc(c.id)}" style="margin-left:6px">${t("connApply")}</button>
      </div>

      <div class="ks-row" style="margin-bottom:6px">
        <span class="ks-label">${t("connObfs")}</span>
        <label class="toggle">
          <input type="checkbox" class="conn-obfs-toggle" data-id="${esc(c.id)}" ${c.obfuscated ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="ks-row" style="margin-bottom:6px">
        <span class="ks-label">${t("connMuxTitle")}</span>
        <label class="toggle">
          <input type="checkbox" class="conn-mux-toggle" data-id="${esc(c.id)}" ${c.mux ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="ks-row" style="margin-bottom:6px">
        <span class="ks-label" title="${t("connTransportSecureTitle")}" style="cursor:help;border-bottom:1px dashed var(--text-muted)">
          Transport Secure ⓘ
        </span>
        <label class="toggle">
          <input type="checkbox" class="conn-transport-secure" data-id="${esc(c.id)}" ${!c.force_obfuscation ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="info-row" style="align-items:center;margin-bottom:6px">
        <span class="info-label" style="min-width:90px" title="${t("connMarionetteTitle")}" style="cursor:help;border-bottom:1px dashed var(--text-muted)">
          Marionette ⓘ
        </span>
        <select class="conn-profile-sel input-sm" data-id="${esc(c.id)}" style="flex:1;max-width:220px">
          ${marionetteProfileOpts(c.behavioral_profile)}
        </select>
        <button class="btn-sm btn-apply conn-profile-apply" data-id="${esc(c.id)}" style="margin-left:6px">${t("connApply")}</button>
      </div>

      ${c.error ? `<div style="color:var(--danger);font-size:12px;margin-top:6px">${esc(c.error)}</div>` : ""}
    </div>` : ""}
  </div>`;
}

// ─── Node-граф ────────────────────────────────────────────────────────────────

const NG_W = 240; // ширина узла
const NG_H = 215; // высота узла
const NG_PORT_R = 7; // радиус портового кружка

function ngSvgCurves(preview?: { sx: number; sy: number; ex: number; ey: number }): string {
  let paths = "";
  connectionsList.forEach((c, innerIdx) => {
    if (!c.encapsulated_in) return;
    const outerIdx = connectionsList.findIndex(x => x.id === c.encapsulated_in);
    if (outerIdx < 0) return;
    const op = nodePositions.get(c.encapsulated_in) ?? getNodePos(c.encapsulated_in, outerIdx);
    const ip = nodePositions.get(c.id) ?? getNodePos(c.id, innerIdx);
    const sx = op.x + NG_W + NG_PORT_R; const sy = op.y + NG_H / 2;
    const tx = ip.x - NG_PORT_R;        const ty = ip.y + NG_H / 2;
    const cx = (sx + tx) / 2;
    paths += `
      <path d="M${sx} ${sy} C${cx} ${sy},${cx} ${ty},${tx} ${ty}"
            stroke="#7c6fff" stroke-width="2.5" fill="none" stroke-dasharray="6,3" opacity=".85"/>
      <circle cx="${sx}" cy="${sy}" r="${NG_PORT_R}" fill="#7c6fff" opacity=".9"/>
      <circle cx="${tx}" cy="${ty}" r="${NG_PORT_R}" fill="#7c6fff" opacity=".9"/>`;
  });
  if (preview) {
    const cx = (preview.sx + preview.ex) / 2;
    paths += `<path d="M${preview.sx} ${preview.sy} C${cx} ${preview.sy},${cx} ${preview.ey},${preview.ex} ${preview.ey}"
      stroke="rgba(124,111,255,.55)" stroke-width="2" fill="none" stroke-dasharray="5,4"/>`;
  }
  return paths;
}

function renderNodeGraph(): string {
  const rows = Math.max(1, Math.ceil(connectionsList.length / 3));
  const canvasH = Math.max(460, rows * 255 + 40);

  const nodes = connectionsList.map((c, idx) => {
    const pos = getNodePos(c.id, idx);
    const dotColor = c.status === "connected" ? "#22c55e"
                   : c.status === "connecting" ? "#f59e0b" : "#6b7280";
    const hasOuter = !!c.encapsulated_in;
    const portY = Math.round(NG_H / 2) - NG_PORT_R;
    const transportOpts = TRANSPORTS.map(tr =>
      `<option value="${tr}" ${c.transport === tr ? "selected" : ""}>${tr}</option>`
    ).join("");

    return `
    <div class="ng-node${hasOuter ? " ng-node-inner" : ""}"
      data-ng-id="${esc(c.id)}"
      style="left:${pos.x}px;top:${pos.y}px;width:${NG_W}px">

      <div class="ng-port ng-port-in" data-ng-port-in="${esc(c.id)}"
        style="top:${portY}px" title="${t("portIn")}"></div>
      <div class="ng-port ng-port-out" data-ng-port-out="${esc(c.id)}"
        style="top:${portY}px" title="${t("portOut")}"></div>

      <div class="ng-node-hdr" data-ng-drag="${esc(c.id)}">
        <span class="ng-dot" style="background:${dotColor};flex-shrink:0"></span>
        <select class="ng-sel conn-transport-inline" data-id="${esc(c.id)}"
          onmousedown="event.stopPropagation()" onclick="event.stopPropagation()">
          ${transportOpts}
        </select>
        <span class="ng-id" title="${esc(c.id)}">${c.id.length > 9 ? c.id.slice(0, 9) + "…" : esc(c.id)}</span>
        <label class="ng-toggle-mini" onmousedown="event.stopPropagation()" title="${t("nodeEnableDisable")}">
          <input type="checkbox" class="conn-toggle" data-id="${esc(c.id)}" ${c.enabled ? "checked" : ""}>
          <span class="ng-toggle-track"></span>
        </label>
        <button class="ng-close-btn" data-ng-close="${esc(c.id)}" onmousedown="event.stopPropagation()">✕</button>
      </div>

      <div class="ng-node-body">
        <div class="ng-row"><span class="ng-lbl">${t("nodeServer")}</span>
          <span style="font-size:10px;opacity:.6;overflow:hidden;text-overflow:ellipsis">${esc(c.server)}</span></div>
        <div class="ng-row" style="align-items:center">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;flex:1" onmousedown="event.stopPropagation()">
            <input type="checkbox" class="conn-mux-quick" data-id="${esc(c.id)}" ${c.mux ? "checked" : ""} style="accent-color:#7c6fff">
            <span class="ng-lbl">MUX</span>
          </label>
          <span style="font-size:10px;color:${dotColor}">${c.status}</span>
        </div>
        <div class="ng-row" style="align-items:center;gap:4px" onmousedown="event.stopPropagation()">
          <input class="ng-inp conn-speed" data-id="${esc(c.id)}" type="number" min="0"
            value="${c.rate_limit_kb}" placeholder="KB/s (0=∞)">
          <button class="ng-apply conn-speed-apply" data-id="${esc(c.id)}">⚡</button>
        </div>
        <div class="ng-row" style="align-items:center;gap:4px" onmousedown="event.stopPropagation()">
          <input class="ng-inp conn-sni" data-id="${esc(c.id)}"
            value="${esc(c.sni)}" placeholder="SNI" style="flex:1;min-width:0">
          <button class="ng-apply conn-sni-apply" data-id="${esc(c.id)}">SNI</button>
        </div>
        <div class="ng-row" style="align-items:center;gap:4px" onmousedown="event.stopPropagation()">
          <input class="ng-inp conn-bridge" data-id="${esc(c.id)}"
            value="${esc(c.bridge)}" placeholder="${t("nodeBridgePlaceholder")}" style="flex:1;min-width:0">
          <button class="ng-apply conn-bridge-apply" data-id="${esc(c.id)}">⇒</button>
        </div>
        ${hasOuter ? `<div class="ng-row" style="margin-top:2px">
          <span class="ng-lbl">⬡ via</span>
          <span style="color:#7c6fff;font-size:10px;overflow:hidden;text-overflow:ellipsis">${esc(c.encapsulated_in!)}</span>
        </div>` : ""}
        ${c.error ? `<div style="color:var(--danger);font-size:10px;margin-top:2px">${esc(c.error)}</div>` : ""}
      </div>

      <div class="ng-node-footer">
        <button class="ng-btn conn-duplicate-quick" data-id="${esc(c.id)}" onmousedown="event.stopPropagation()"
          title="${t("nodeDuplicate")}">⊕ ${t("nodeDup")}</button>
        ${hasOuter ? `<button class="ng-btn ng-btn-danger" data-ng-unchain="${esc(c.id)}" onmousedown="event.stopPropagation()"
          title="${t("nodeUnchain")}">✕ link</button>` : ""}
      </div>
    </div>`;
  }).join("");

  return `
    <div style="position:relative">
      <div style="font-size:11px;opacity:.45;margin-bottom:6px;padding-left:2px">
        ${t("nodeDragHint")}
      </div>
      <div class="ng-canvas" id="ng-canvas" style="height:${canvasH}px">
        <svg id="ng-svg" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none">
          ${ngSvgCurves()}
        </svg>
        ${nodes}
      </div>
    </div>`;
}

function bindNodeGraphEvents(): void {
  const canvas = document.getElementById("ng-canvas");
  if (!canvas) return;

  let draggingNode: string | null = null;
  let dragOffX = 0, dragOffY = 0;
  let cachedRect: DOMRect | null = null;

  canvas.addEventListener("pointerdown", e => {
    const portOut = (e.target as HTMLElement).closest<HTMLElement>("[data-ng-port-out]");
    if (portOut) {
      const srcId = portOut.dataset.ngPortOut!;
      const srcIdx = connectionsList.findIndex(c => c.id === srcId);
      const pos = nodePositions.get(srcId) ?? getNodePos(srcId, srcIdx);
      ngPortDrag = {
        srcId,
        sx: pos.x + NG_W + NG_PORT_R,
        sy: pos.y + NG_H / 2,
        ex: pos.x + NG_W + NG_PORT_R,
        ey: pos.y + NG_H / 2,
      };
      cachedRect = canvas.getBoundingClientRect();
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const hdr = (e.target as HTMLElement).closest<HTMLElement>("[data-ng-drag]");
    if (!hdr) return;
    draggingNode = hdr.dataset.ngDrag!;
    const node = canvas.querySelector<HTMLElement>(`[data-ng-id="${draggingNode}"]`)!;
    const rect = canvas.getBoundingClientRect();
    cachedRect = rect;
    const pos = nodePositions.get(draggingNode) ?? getNodePos(draggingNode, connectionsList.findIndex(c => c.id === draggingNode));
    dragOffX = e.clientX - rect.left - pos.x;
    dragOffY = e.clientY - rect.top  - pos.y;
    node.style.zIndex = "10";
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", e => {
    const rect = cachedRect ?? canvas.getBoundingClientRect();
    if (ngPortDrag) {
      ngPortDrag.ex = e.clientX - rect.left;
      ngPortDrag.ey = e.clientY - rect.top;
      redrawNGSvg();
      return;
    }
    if (!draggingNode) return;
    const node = canvas.querySelector<HTMLElement>(`[data-ng-id="${draggingNode}"]`);
    if (!node) return;
    const x = Math.max(0, e.clientX - rect.left - dragOffX);
    const y = Math.max(0, e.clientY - rect.top  - dragOffY);
    nodePositions.set(draggingNode, { x, y });
    node.style.left = x + "px";
    node.style.top  = y + "px";
    redrawNGSvg();
  });

  canvas.addEventListener("pointerup", e => {
    if (ngPortDrag) {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const portIn = target?.closest<HTMLElement>("[data-ng-port-in]");
      if (portIn) {
        const outerId = portIn.dataset.ngPortIn!;
        const innerId = ngPortDrag.srcId;
        ngPortDrag = null;
        if (outerId !== innerId) {
          invoke("encapsulate_connection", { innerId, outerId })
            .then(async () => {
              await fetchConnections();
              renderPage();
              showToast(`${innerId.slice(0,6)}… ${t("encapsulatedIn")} ${outerId.slice(0,6)}…`, "success", 2500);
            })
            .catch(err => { showToast(String(err), "error", 4000); renderPage(); });
        }
      } else {
        ngPortDrag = null;
        redrawNGSvg();
      }
      return;
    }
    cachedRect = null;
    if (draggingNode) {
      const node = canvas.querySelector<HTMLElement>(`[data-ng-id="${draggingNode}"]`);
      if (node) node.style.zIndex = "";
      saveNodePositions();
      draggingNode = null;
    }
  });

  canvas.addEventListener("click", e => {
    const unchainBtn = (e.target as HTMLElement).closest<HTMLElement>("[data-ng-unchain]");
    if (unchainBtn) {
      const innerID = unchainBtn.dataset.ngUnchain!;
      invoke("encapsulate_connection", { innerId: innerID, outerId: "" })
        .then(async () => {
          await fetchConnections();
          renderPage();
          showToast(t("encapRemoved"), "info", 2000);
        })
        .catch(err => showToast(String(err), "error", 4000));
      return;
    }

    const closeBtn = (e.target as HTMLElement).closest<HTMLElement>("[data-ng-close]");
    if (closeBtn) {
      const id = closeBtn.dataset.ngClose!;
      invoke("close_connection", { id }).catch(() => {});
      connectionsExpanded.delete(id);
      showToast(t("connClosed"), "info", 2000);
      fetchConnections().then(() => renderPage());
      return;
    }
  });

  document.querySelectorAll<HTMLInputElement>(".conn-toggle").forEach(cb => {
    cb.addEventListener("change", async () => {
      await invoke("toggle_connection", { id: cb.dataset.id!, enabled: cb.checked }).catch(() => {});
      await fetchConnections();
      renderPage();
    });
  });

  document.querySelectorAll<HTMLInputElement>(".conn-mux-quick").forEach(cb => {
    cb.addEventListener("change", async () => {
      await invoke("set_connection_mux", { id: cb.dataset.id!, enabled: cb.checked }).catch(() => {});
      showToast(cb.checked ? t("muxOn") : t("muxOff"), "success", 1400);
    });
  });

  document.querySelectorAll<HTMLSelectElement>(".conn-transport-inline").forEach(sel => {
    sel.addEventListener("change", async () => {
      try {
        await invoke("switch_transport", { id: sel.dataset.id!, transport: sel.value });
        showToast(`${t("transportSet")} ${sel.value}`, "success", 2000);
        setTimeout(async () => { await fetchConnections(); renderPage(); }, 1500);
      } catch (e: unknown) {
        showToast(String(e), "error", 5000);
        await fetchConnections(); renderPage();
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".conn-speed-apply").forEach(btn => {
    btn.addEventListener("click", async () => {
      const inp = canvas.querySelector<HTMLInputElement>(`.conn-speed[data-id="${btn.dataset.id}"]`);
      await invoke("set_connection_speed", { id: btn.dataset.id!, rateLimitKb: parseInt(inp?.value ?? "0") || 0 }).catch(() => {});
      showToast(t("speedUpdated"), "success", 1500);
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".conn-sni-apply").forEach(btn => {
    btn.addEventListener("click", async () => {
      const inp = canvas.querySelector<HTMLInputElement>(`.conn-sni[data-id="${btn.dataset.id}"]`);
      await invoke("set_connection_sni", { id: btn.dataset.id!, sni: inp?.value ?? "" }).catch(() => {});
      showToast("SNI →" + (inp?.value || "cleared"), "success", 1500);
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".conn-bridge-apply").forEach(btn => {
    btn.addEventListener("click", async () => {
      const inp = canvas.querySelector<HTMLInputElement>(`.conn-bridge[data-id="${btn.dataset.id}"]`);
      await invoke("set_connection_bridge", { id: btn.dataset.id!, bridge: inp?.value ?? "" }).catch(() => {});
      showToast(t("bridgeUpdated"), "success", 1500);
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".conn-duplicate-quick").forEach(btn => {
    btn.addEventListener("click", async () => {
      const newId = await invoke<string>("duplicate_connection", { id: btn.dataset.id! }).catch(() => "");
      if (newId) {
        connectionsExpanded.add(newId);
        showToast(t("duplicated"), "success", 2000);
      }
      await fetchConnections();
      renderPage();
    });
  });
}

// Перерисовывает только SVG-кривые без полного DOM rebuild.
function redrawNGSvg(): void {
  const svg = document.getElementById("ng-svg");
  if (!svg) return;
  svg.innerHTML = ngSvgCurves(ngPortDrag ?? undefined);
}

// ─── END Node-граф ────────────────────────────────────────────────────────────

function renderAgentPanel(): string {
  const a = _agentStats;
  if (!a || (a as any).state === "disabled") {
    return `<div class="card" style="margin-top:9px;opacity:.55">
      <div class="card-header"><span class="card-title">${t("agentTransport")}</span></div>
      <div style="padding:8px 0;font-size:12px;color:var(--text-muted)">${t("agentNotRunning")}</div>
    </div>`;
  }

  const stateNames: Record<string | number, string> = {
    0: t("agentIdle"),
    1: t("agentProbing"),
    2: t("agentRotating"),
    3: t("agentConnected"),
    4: t("agentBlocked"),
  };
  const stateName = stateNames[a.state] ?? String(a.state);
  const stateColor = a.state === 3 ? "var(--success)" : a.state === 4 ? "var(--danger)" : "var(--text-muted)";

  const arms = (a.arms || []);
  const maxQ = Math.max(...arms.map(x => x.q_value), 0.01);

  const armRows = arms.map(arm => {
    const barW = Math.round((arm.q_value / maxQ) * 100);
    const isActive = a.arms[a.current_arm]?.name === arm.name;
    const okColor = arm.last_ok ? "var(--success)" : "var(--danger)";
    const streakStr = arm.streak > 0 ? `+${arm.streak}` : String(arm.streak);
    return `<div style="margin:5px 0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
        <span style="font-size:12px;font-weight:${isActive ? 600 : 400};min-width:90px">${esc(arm.name)}${isActive ? " ▶" : ""}</span>
        <div style="flex:1;height:6px;background:var(--border-color);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${barW}%;background:var(--accent);border-radius:3px;transition:width .3s"></div>
        </div>
        <span style="font-size:11px;color:var(--text-muted);min-width:36px;text-align:right">Q=${arm.q_value.toFixed(2)}</span>
        <span style="font-size:11px;color:${okColor};min-width:18px">${arm.attempts > 0 ? streakStr : "—"}</span>
      </div>
      <div style="font-size:10px;color:var(--text-muted);padding-left:98px">${arm.attempts > 0 ? `${arm.successes}/${arm.attempts} ok · ${Math.round(arm.avg_ms)}ms` : t("agentNoData")}</div>
    </div>`;
  }).join("");

  return `<div class="card" style="margin-top:9px">
    <div class="card-header">
      <span class="card-title">${t("agentTransportUCB")}</span>
      <button class="refresh-btn" id="btn-agent-refresh" title="${t("agentRefresh")}">${ICONS.refresh}</button>
    </div>
    <div class="info-row">
      <span class="info-label">${t("agentState")}</span>
      <span class="info-value" style="color:${stateColor}">${stateName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${t("agentProbesRotations")}</span>
      <span class="info-value">${a.total_probes} / ${a.total_rotations}</span>
    </div>
    <div style="margin:10px 0 4px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">${t("agentQValues")}</div>
    ${armRows}
    <div style="margin-top:10px">
      <button class="btn-sm" id="btn-agent-apply" style="font-size:12px;padding:5px 14px">${t("agentApply")}</button>
    </div>
  </div>`;
}

function renderP2PPanel(): string {
  const s = _p2pStatus;
  const relayAddr = settings.p2p_relay_addr || "";
  const statusColor = s.connected ? "var(--success)" : s.registered ? "var(--accent)" : "var(--text-muted)";
  const statusText = s.connected
    ? t("p2pConnected")
    : s.registered
      ? t("p2pRegistered")
      : t("p2pInactive");

  return `<div class="card" style="margin-top:9px">
    <div class="card-header">
      <span class="card-title">${t("p2pRelay")}</span>
      <span style="font-size:11px;color:${statusColor}">${statusText}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${t("p2pRelayAddr")}</span>
      <input id="p2p-relay-addr" class="input-inline" style="flex:1;font-size:12px"
        placeholder="host:8445" value="${esc(relayAddr)}" />
    </div>
    <div class="info-row">
      <span class="info-label">${t("p2pSecret")}</span>
      <input id="p2p-secret" class="input-inline" style="flex:1;font-size:12px" type="password"
        placeholder="${t("p2pSharedSecret")}" value="${esc(settings.p2p_secret || "")}" />
    </div>
    ${s.registered && s.peer_id ? `<div class="info-row">
      <span class="info-label">Peer ID</span>
      <span class="info-value" style="font-family:monospace;font-size:11px;word-break:break-all">${esc(s.peer_id)}</span>
      <button class="refresh-btn" id="btn-p2p-copy" title="${t("p2pCopied")}">${ICONS.link}</button>
    </div>` : ""}
    ${s.registered && !s.connected ? `<div class="info-row" style="margin-top:4px">
      <span class="info-label">${t("p2pConnectTo")}</span>
      <input id="p2p-target-id" class="input-inline" style="flex:1;font-size:12px" placeholder="peer ID hex" />
    </div>` : ""}
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      ${!s.registered
        ? `<button class="btn-sm" id="btn-p2p-register" style="font-size:12px;padding:5px 14px">${t("p2pRegister")}</button>`
        : s.connected
          ? `<button class="btn-danger" id="btn-p2p-disconnect" style="font-size:12px;padding:5px 14px">${t("p2pDisconnect")}</button>`
          : `<button class="btn-sm" id="btn-p2p-connect-peer" style="font-size:12px;padding:5px 14px">${t("p2pConnectPeer")}</button>
             <button class="btn-danger" id="btn-p2p-disconnect" style="font-size:12px;padding:5px 14px">${t("p2pCancel")}</button>`
      }
    </div>
  </div>`;
}

function renderConnections(): string {
  const server = getServerHost() || (settings.conn_key ? t("connKeyEncrypted") : t("notSet"));
  const uptimeStr = isConnected && connectTime ? formatDuration(Date.now() - connectTime) : "—";
  const stChipCls = isConnected ? "chip-active" : "chip-idle";
  const stChipTxt = isConnected ? t("active") : t("inactive");
  const connCount = connectionsList.length;
  const activeCount = connectionsList.filter(c => c.status === "connected").length;

  const connCards = connectionsList.map(renderConnectionCard).join("");

  return `
    <div class="page-header">
      <h2 class="page-title">${t("connections")}</h2>
      <span class="conn-chip ${stChipCls}">${stChipTxt}</span>
    </div>

    <div class="card" style="margin-bottom:9px">
      <div class="card-header">
        <span class="card-title">${t("tunnel")}</span>
        <button class="refresh-btn" id="btn-refresh-conns">${ICONS.refresh}</button>
      </div>
      <div class="info-row">
        <span class="info-label">${t("server")}</span>
        <span class="info-value">${esc(server)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${t("duration")}</span>
        <span class="info-value" id="conn-uptime">${uptimeStr}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${t("connCountLabel")}</span>
        <span class="info-value">${activeCount} / ${connCount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">${t("connKeysConfigured")}</span>
        <span class="info-value">${1 + (settings.extra_keys?.length ?? 0)}
          ${(settings.extra_keys?.length ?? 0) > 0
            ? `<span style="font-size:11px;opacity:.5">(1 + ${settings.extra_keys!.length} extra)</span>`
            : ""}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Kill Switch</span>
        <span class="info-value"><span class="${settings.kill_switch ? "badge-on" : "badge-off"}">${settings.kill_switch ? "ON" : "OFF"}</span></span>
      </div>
    </div>

    <div id="conn-list">${nodeViewActive ? renderNodeGraph() : connCards}</div>

    <div class="card" style="margin-top:9px">
      <div class="card-header"><span class="card-title">${t("proxy")}</span></div>
      <div class="info-row">
        <span class="info-label">SOCKS5</span>
        <span class="info-value">${esc(settings.socks_addr)}:10800</span>
      </div>
      <div class="info-row">
        <span class="info-label">Mihomo</span>
        <span class="info-value">:${settings.mihomo_port}</span>
      </div>
      <div class="info-row">
        <span class="info-label">IPv6</span>
        <span class="info-value"><span class="${settings.ipv6 ? "badge-on" : "badge-off"}">${settings.ipv6 ? "ON" : "OFF"}</span></span>
      </div>
    </div>

    <div class="card collapse-card" style="margin-top:9px" id="extra-keys-collapse-card">
      <div class="card-header collapse-hdr" id="extra-keys-collapse-hdr">
        <span class="card-title">${t("connEncapTitle")}</span>
        <span class="collapse-arrow">▼</span>
      </div>
      <div class="collapse-body" id="extra-keys-collapse-body">
        <div style="font-size:12px;opacity:.55;margin-bottom:8px">
          ${t("connEncapDesc2")}
        </div>
        ${(settings.extra_keys || []).map((k, i) => `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:10px;padding:1px 5px;border-radius:3px;background:var(--accent-muted,#3d3d6b);color:var(--accent,#a78bfa)">key ${i + 2}</span>
            <code style="flex:1;font-size:11px;opacity:.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(k)}</code>
            <button class="btn-sm btn-danger extra-key-remove" data-idx="${i}" style="font-size:11px;padding:1px 7px">✕</button>
          </div>`).join("")}
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          <input id="extra-key-new-input" class="input-sm" style="flex:1 1 100%;min-width:0" placeholder="whispera://...">
          <button class="btn-sm" id="btn-extra-key-add">${t("connAdd")}</button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:9px">
      <div class="card-header">
        <span class="card-title">${t("connEncap")}</span>
      </div>
      <div style="font-size:12px;opacity:.55;margin-bottom:10px">
        ${t("connEncapDesc")}
      </div>
      ${connectionsList.length < 2
        ? `<div style="font-size:12px;color:#fbbf24;display:flex;align-items:center;gap:5px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
            ${t("connNeedTwo")}
           </div>`
        : `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <select id="encap-outer" class="input-inline" style="flex:1;font-size:12px">
              <option value="">${t("connEncapOuter")}</option>
              ${connectionsList.map(c => `<option value="${esc(c.id)}">${esc(c.transport)} (${esc(c.id)})</option>`).join("")}
            </select>
            <span style="opacity:.4;font-size:14px">⊃</span>
            <select id="encap-inner" class="input-inline" style="flex:1;font-size:12px">
              <option value="">${t("connEncapInner")}</option>
              ${connectionsList.map(c => `<option value="${esc(c.id)}">${esc(c.transport)} (${esc(c.id)})</option>`).join("")}
            </select>
            <button class="btn-sm" id="btn-encapsulate">${t("connApply")}</button>
          </div>`}
    </div>

    ${renderAgentPanel()}

    ${renderP2PPanel()}

    <div class="card" style="margin-top:9px">
      <div class="card-header"><span class="card-title">TLS Fingerprint</span></div>
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

    ${connectionsList.length === 0 && !nodeViewActive ? `
    <div class="empty-state" style="padding:32px 0;margin-top:9px">
      <p style="opacity:.4">${t("connNoActive")}</p>
    </div>` : ""}`;

}

function bindConnectionsEvents(): void {
  document.getElementById("btn-refresh-conns")?.addEventListener("click", async () => {
    await fetchConnections();
    renderPage();
  });

  document.getElementById("btn-encapsulate")?.addEventListener("click", async () => {
    const outer = (document.getElementById("encap-outer") as HTMLSelectElement)?.value;
    const inner = (document.getElementById("encap-inner") as HTMLSelectElement)?.value;
    if (!outer || !inner || outer === inner) {
      showToast(t("selectTwoConns"), "error", 2000);
      return;
    }
    try {
      await invoke("encapsulate_connection", { innerId: inner, outerId: outer });
      showToast(t("encapApplied"), "success", 2000);
    } catch (e) {
      showToast(String(e), "error", 3000);
    }
  });

  document.getElementById("btn-toggle-node-view")?.addEventListener("click", () => {
    nodeViewActive = !nodeViewActive;
    ngPortDrag = null;
    localStorage.setItem("whispera_ng_view", nodeViewActive ? "1" : "0");
    renderPage();
  });

  document.getElementById("btn-agent-refresh")?.addEventListener("click", async () => {
    await fetchAgentStats();
    renderPage();
  });

  // P2P panel events
  document.getElementById("btn-p2p-register")?.addEventListener("click", async () => {
    const addrEl = document.getElementById("btn-p2p-register")?.closest(".card")?.querySelector<HTMLInputElement>("#p2p-relay-addr");
    const secretEl = document.getElementById("btn-p2p-register")?.closest(".card")?.querySelector<HTMLInputElement>("#p2p-secret");
    const relayAddr = addrEl?.value.trim() || settings.p2p_relay_addr || "";
    const secret = secretEl?.value.trim() || settings.p2p_secret || "";
    if (!relayAddr) { showToast(t("enterRelayAddr"), "error"); return; }
    try {
      if (relayAddr !== settings.p2p_relay_addr) { await invoke("patch_app_settings", { patch: { p2p_relay_addr: relayAddr } }).catch(() => {}); settings.p2p_relay_addr = relayAddr; }
      if (secret !== settings.p2p_secret) { await invoke("patch_app_settings", { patch: { p2p_secret: secret } }).catch(() => {}); settings.p2p_secret = secret; }
      const peerId = await invoke<string>("p2p_register", { relayAddr, secret });
      showToast(`Peer ID: ${peerId.slice(0, 12)}…`, "success", 5000);
      await fetchP2PStatus();
      renderPage();
    } catch (e) { showToast(String(e), "error"); }
  });

  document.getElementById("btn-p2p-copy")?.addEventListener("click", () => {
    if (_p2pStatus.peer_id) {
      clipboardWrite(_p2pStatus.peer_id).catch(() => navigator.clipboard?.writeText(_p2pStatus.peer_id));
      showToast(t("copied"), "success", 1500);
    }
  });

  document.getElementById("btn-p2p-connect-peer")?.addEventListener("click", async () => {
    const targetEl = document.getElementById("p2p-target-id") as HTMLInputElement | null;
    const target = targetEl?.value.trim() || "";
    if (!target) { showToast(t("enterPeerId"), "error"); return; }
    try {
      await invoke("p2p_connect", { target, relayAddr: _p2pStatus.relay_addr, secret: settings.p2p_secret || "" });
      showToast(t("p2pEstablished"), "success", 4000);
      await fetchP2PStatus();
      renderPage();
    } catch (e) { showToast(String(e), "error"); }
  });

  document.getElementById("btn-p2p-disconnect")?.addEventListener("click", async () => {
    try {
      await invoke("p2p_disconnect");
      await fetchP2PStatus();
      renderPage();
    } catch (e) { showToast(String(e), "error"); }
  });

  document.getElementById("btn-agent-apply")?.addEventListener("click", async () => {
    try {
      const rec = await invoke<{ transport: string; server: string }>("agent_recommend");
      if (!rec.transport) { showToast(t("noRecommendation"), "error"); return; }
      // Apply to all enabled connections
      const connected = connectionsList.filter(c => c.status === "connected" || c.status === "connecting");
      if (connected.length === 0) { showToast(t("noActiveConns"), "error"); return; }
      await Promise.all(connected.map(c => invoke("switch_transport", { id: c.id, transport: rec.transport }).catch(() => {})));
      showToast(`${t("transportSet")} ${rec.transport}`, "success", 3000);
      await fetchConnections();
      renderPage();
    } catch (e) { showToast(String(e), "error"); }
  });

  document.getElementById("extra-keys-collapse-hdr")?.addEventListener("click", () => {
    const card = document.getElementById("extra-keys-collapse-card");
    card?.classList.toggle("open");
  });

  document.getElementById("btn-extra-key-add")?.addEventListener("click", async () => {
    const inp = document.getElementById("extra-key-new-input") as HTMLInputElement | null;
    const key = inp?.value.trim() ?? "";
    if (!key.startsWith("whispera://")) {
      showToast(t("keyInvalidFormat"), "error", 2000);
      return;
    }
    const keys = [...(settings.extra_keys || []), key];
    settings.extra_keys = keys;
    await invoke("patch_app_settings", { patch: { extra_keys: keys } }).catch(() => {});
    if (inp) inp.value = "";
    showToast(`${t("keyAdded")} ${keys.length})`, "success", 2000);
    renderPage();
  });

  document.querySelectorAll<HTMLButtonElement>(".extra-key-remove").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = parseInt(btn.dataset.idx ?? "0");
      const keys = [...(settings.extra_keys || [])];
      keys.splice(idx, 1);
      settings.extra_keys = keys;
      await invoke("patch_app_settings", { patch: { extra_keys: keys } }).catch(() => {});
      showToast(t("keyRemoved"), "info", 1500);
      renderPage();
    });
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
      await invoke("apply_tls_fingerprint");
      showToast(`${t("fingerprintSet")} ${currentFingerprint}`, "success", 2000);
    } catch (e) {
      showToast(String(e), "error", 3000);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  if (nodeViewActive) {
    bindNodeGraphEvents();
    return; // node view управляет своими событиями самостоятельно
  }

  document.querySelectorAll<HTMLElement>("[data-expand]").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.expand!;
      if (connectionsExpanded.has(id)) connectionsExpanded.delete(id);
      else connectionsExpanded.add(id);
      renderPage();
    });
  });

  document.querySelectorAll<HTMLInputElement>(".conn-toggle").forEach(cb => {
    cb.addEventListener("change", async () => {
      const id = cb.dataset.id!;
      await invoke("toggle_connection", { id, enabled: cb.checked }).catch(() => {});
      await fetchConnections();
      renderPage();
    });
  });

  document.querySelectorAll<HTMLInputElement>(".conn-obfs-toggle").forEach(cb => {
    cb.addEventListener("change", async () => {
      const id = cb.dataset.id!;
      await invoke("toggle_obfuscation", { id, enabled: cb.checked }).catch(() => {});
    });
  });

  document.querySelectorAll<HTMLInputElement>(".conn-mux-toggle").forEach(cb => {
    cb.addEventListener("change", async () => {
      const id = cb.dataset.id!;
      await invoke("set_connection_mux", { id, enabled: cb.checked }).catch(() => {});
    });
  });

  document.querySelectorAll<HTMLInputElement>(".conn-mux-quick").forEach(cb => {
    cb.addEventListener("change", async () => {
      const id = cb.dataset.id!;
      await invoke("set_connection_mux", { id, enabled: cb.checked }).catch(() => {});
      showToast(cb.checked ? t("muxEnabled") : t("muxDisabled"), "success", 1500);
    });
  });

  document.querySelectorAll<HTMLSelectElement>(".conn-transport-inline").forEach(sel => {
    sel.addEventListener("change", async () => {
      const id = sel.dataset.id!;
      const btn = sel.closest(".conn-entry")?.querySelector<HTMLButtonElement>(".conn-transport-apply");
      if (btn) btn.textContent = "…";
      try {
        await invoke("switch_transport", { id, transport: sel.value });
        showToast(`${t("transportSet")} ${sel.value}`, "success", 2000);
        setTimeout(async () => { await fetchConnections(); renderPage(); }, 1500);
      } catch (e: unknown) {
        showToast(String(e), "error", 5000);
        await fetchConnections(); renderPage();
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".conn-close-quick").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      await invoke("close_connection", { id }).catch(() => {});
      connectionsExpanded.delete(id);
      showToast(t("connClosed"), "info", 2000);
      await fetchConnections();
      renderPage();
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".conn-duplicate-quick").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      const newId = await invoke<string>("duplicate_connection", { id }).catch(() => "");
      if (newId) {
        connectionsExpanded.add(newId);
        showToast(`${t("duplicatedTo")} ${newId}`, "success", 2500);
      }
      await fetchConnections();
      renderPage();
    });
  });

  // Transport Secure toggle: ON = доверяем транспорту (force_obfuscation OFF)
  document.querySelectorAll<HTMLInputElement>(".conn-transport-secure").forEach(cb => {
    cb.addEventListener("change", async () => {
      const id = cb.dataset.id!;
      await invoke("set_transport_secure", { id, enabled: cb.checked })
        .catch(err => showToast(String(err), "error", 3000));
      showToast(
        cb.checked ? t("connTransportSecureOn") : t("connTransportSecureOff"),
        "info", 2500
      );
    });
  });

  // Marionette: применить поведенческий профиль
  document.querySelectorAll<HTMLButtonElement>(".conn-profile-apply").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      const sel = document.querySelector<HTMLSelectElement>(`.conn-profile-sel[data-id="${id}"]`);
      if (!sel) return;
      try {
        await invoke("set_behavioral_profile", { id, profile: sel.value });
        showToast(
          sel.value
            ? `${t("profileSet")} ${sel.value}`
            : t("marionetteDisabled"),
          "success", 2000
        );
      } catch (err) {
        showToast(String(err), "error", 4000);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".conn-port-apply").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      const inp = document.querySelector<HTMLInputElement>(`.conn-port[data-id="${id}"]`);
      if (!inp || !inp.value.trim()) return;
      await invoke("change_connection_port", { id, port: inp.value.trim() }).catch(() => {});
      showToast(t("portUpdated"), "success", 1800);
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".conn-sni-apply").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      const inp = document.querySelector<HTMLInputElement>(`.conn-sni[data-id="${id}"]`);
      if (!inp) return;
      await invoke("set_connection_sni", { id, sni: inp.value }).catch(() => {});
      showToast("SNI updated", "success", 1800);
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".conn-bridge-apply").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      const inp = document.querySelector<HTMLInputElement>(`.conn-bridge[data-id="${id}"]`);
      if (!inp) return;
      await invoke("set_connection_bridge", { id, bridge: inp.value }).catch(() => {});
      showToast(t("bridgeUpdated"), "success", 1800);
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".conn-speed-apply").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      const inp = document.querySelector<HTMLInputElement>(`.conn-speed[data-id="${id}"]`);
      if (!inp) return;
      const kb = parseInt(inp.value) || 0;
      await invoke("set_connection_speed", { id, rateLimitKb: kb }).catch(() => {});
      showToast(t("speedUpdated"), "success", 1800);
    });
  });

}

function renderProfiles(): string {
  const profileList = profiles.length === 0
    ? `<div class="empty-state"><div class="empty-icon">${ICONS.user}</div><p>${t("noProfiles")}</p></div>`
    : profiles.map(p => `
        <div class="profile-card">
          <div class="profile-info"><span>${ICONS.user}</span><span>${esc(p.name)}</span></div>
          <div class="profile-actions">
            <button class="btn-use-profile" data-id="${p.id}" title="${t("subSelectKey")}">${ICONS.play}</button>
            <button class="btn-del-profile" data-id="${p.id}" title="${t("subDelete")}">${ICONS.x}</button>
          </div>
        </div>`).join("");

  const subList = subscriptions.length === 0
    ? `<div class="empty-state"><p>${t("noSubscriptions")}</p></div>`
    : subscriptions.map(s => {
        const keyRows = s.keys.map((k, i) => {
          const pr = pingResults.get(`${s.id}:${i}`);
          const pingLabel = pr === "pinging" ? `<span class="ping-val pinging">${t("pingRunning")}</span>`
            : pr === "timeout" ? `<span class="ping-val timeout">${t("pingTimeout")}</span>`
            : pr !== undefined ? `<span class="ping-val ok">${pr}${t("pingMs")}</span>`
            : "";
          return `
          <div class="sub-key-row">
            <span class="sub-key-val" title="${esc(k)}">${esc(k.length > 50 ? k.slice(0, 50) + "…" : k)}</span>
            ${pingLabel}
            <button class="btn-ping-key" data-sub="${s.id}" data-idx="${i}" data-key="${esc(k)}" title="${t("pingKey")}">${ICONS.ping}</button>
            <button class="btn-use-sub-key" data-sub="${s.id}" data-idx="${i}">${ICONS.play}</button>
          </div>`;
        }).join("");
        const updLabel = s.updated ? `<span class="sub-meta">${t("subLastUpdated")}: ${s.updated.slice(0, 10)}</span>` : "";
        return `
          <div class="profile-card sub-card">
            <div class="profile-info">
              <span>${ICONS.link}</span>
              <span>${esc(s.name || s.url)}</span>
              <span class="sub-meta">${s.keys.length} ${t("subKeys")}</span>
              ${updLabel}
            </div>
            <div class="profile-actions">
              <button class="btn-ping-all-sub" data-id="${s.id}" title="${t("pingAll")}">${ICONS.ping}</button>
              <button class="btn-rename-sub" data-id="${s.id}" title="${t("subRename")}">${ICONS.pencil}</button>
              <button class="btn-refresh-sub" data-id="${s.id}" title="${t("subRefresh")}">${subUpdateAvailable.has(s.id) ? '<span class="sub-update-dot"></span>' : ""}${ICONS.refresh}</button>
              <button class="btn-del-sub" data-id="${s.id}" title="${t("subDelete")}">${ICONS.x}</button>
            </div>
            ${s.keys.length > 0 ? `<div class="sub-keys">${keyRows}</div>` : ""}
          </div>`;
      }).join("");

  return `
    <div class="page-header">
      <h2 class="page-title">${t("profiles")}</h2>
      <button class="btn-add-profile" id="btn-add-profile">${t("addProfile")}</button>
    </div>
    ${profileList}
    <div class="section-header">
      <span class="section-title">${t("subscriptions")}</span>
      <button class="btn-add-profile" id="btn-add-sub">${t("addSubscription")}</button>
    </div>
    ${subList}`;
}

function bindProfileEvents(): void {
  document.getElementById("btn-add-profile")?.addEventListener("click", () => showProfileModal());

  document.querySelectorAll<HTMLElement>(".btn-use-profile").forEach(el => {
    el.addEventListener("click", () => {
      const p = profiles.find(x => x.id === el.dataset.id);
      if (p) { settings.conn_key = p.key; persistSettings(); currentPage = "home"; renderNav(); renderPage(); }
    });
  });
  document.querySelectorAll<HTMLElement>(".btn-del-profile").forEach(el => {
    el.addEventListener("click", () => { profiles = profiles.filter(x => x.id !== el.dataset.id); saveProfiles(); renderPage(); });
  });

  document.getElementById("btn-add-sub")?.addEventListener("click", () => showSubModal());

  document.querySelectorAll<HTMLElement>(".btn-ping-key").forEach(el => {
    el.addEventListener("click", async () => {
      const subId = el.dataset.sub!;
      const idx = parseInt(el.dataset.idx ?? "0", 10);
      const key = el.dataset.key!;
      const mapKey = `${subId}:${idx}`;
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
      }).catch(() => { });
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
      } catch { showToast(t("subUpdateFailed"), "error"); }
      renderPage();
    });
  });
  document.querySelectorAll<HTMLElement>(".btn-del-sub").forEach(el => {
    el.addEventListener("click", async () => {
      const id = el.dataset.id!;
      await invoke("delete_subscription", { id }).catch(() => {/**/});
      subscriptions = subscriptions.filter(s => s.id !== id);
      renderPage();
    });
  });
  document.querySelectorAll<HTMLElement>(".btn-use-sub-key").forEach(el => {
    el.addEventListener("click", () => {
      const sub = subscriptions.find(s => s.id === el.dataset.sub);
      const idx = parseInt(el.dataset.idx ?? "0", 10);
      if (sub && sub.keys[idx]) {
        settings.conn_key = sub.keys[idx];
        persistSettings();
        currentPage = "home";
        renderNav();
        renderPage();
      }
    });
  });
}

function showSubModal(): void {
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
        <input id="sub-modal-url" placeholder="${t("subUrlHint")}" />
      </div>
      <div id="sub-modal-err" style="color:var(--danger,#e55);font-size:12px;margin-top:-6px;display:none"></div>
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
      if (currentPage === "profiles") renderPage();
    } catch (e) {
      errEl.textContent = String(e);
      errEl.style.display = "";
      btn.disabled = false; btn.textContent = t("save");
    }
  });
}

const DISCORD_RULE_ID = "discord-builtin";
const DISCORD_UPDATE_RULE_ID = "discord-update-builtin";


function getDiscordRule(): RoutingRule | undefined {
  return routingRules.find(r =>
    r.id === DISCORD_RULE_ID ||
    (r.kind === "process" && r.value.toLowerCase() === "discord.exe")
  );
}

async function setDiscordMode(action: "PROXY" | "DIRECT"): Promise<void> {
  const main = getDiscordRule();
  if (main) {
    main.action = action;
  } else {
    routingRules.push({ id: DISCORD_RULE_ID, kind: "process", value: "Discord.exe", action });
  }
  const upd = routingRules.find(r => r.id === DISCORD_UPDATE_RULE_ID ||
    (r.kind === "process" && r.value.toLowerCase() === "update.exe"));
  if (upd) {
    upd.action = action;
  } else {
    routingRules.push({ id: DISCORD_UPDATE_RULE_ID, kind: "process", value: "Update.exe", action });
  }
  await persistRoutingRules();
}

function renderRouting(): string {
  const discordRule = getDiscordRule();
  const discordAction = discordRule?.action ?? "PROXY";
  const discordIds = new Set([DISCORD_RULE_ID, DISCORD_UPDATE_RULE_ID]);
  const discordProcs = new Set(["discord.exe", "update.exe"]);

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
    if (isAndroid && currentType === "process") showToast(t("reconnectRequired"), "info", 3500);
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

let logFilter = "all";
let logSearch = "";

function renderLogs(): string {
  const filtered = logLines.filter(line => {
    if (logFilter !== "all") {
      const level = logFilter.toUpperCase();
      if (!line.toUpperCase().includes(`[${level}]`) && !line.toUpperCase().includes(`"level":"${level}"`)) return false;
    }
    if (logSearch && !line.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });
  const colorized = filtered.map(line => {
    let cls = "log-line";
    const upper = line.toUpperCase();
    if (upper.includes("[ERROR]") || upper.includes('"level":"error"')) cls += " log-error";
    else if (upper.includes("[WARN]") || upper.includes('"level":"warn"')) cls += " log-warn";
    else if (upper.includes("[INFO]") || upper.includes('"level":"info"')) cls += " log-info";
    else if (upper.includes("[DEBUG]") || upper.includes('"level":"debug"')) cls += " log-debug";
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
        <button class="pill-btn log-filter-btn ${logFilter === "debug" ? "active" : ""}" data-filter="debug">Debug</button>
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
        <input type="text" id="set-vpn-dns" value="${esc(vpnDnsVal)}" placeholder="1.1.1.1" style="width:100%;box-sizing:border-box"/>
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
      <div class="setting-row" style="align-items:center">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">
          <span class="setting-label">${t("mitmInspection")}</span>
          <span style="font-size:11px;opacity:.5;font-weight:400">${t("mitmDesc")}</span>
        </div>
        <div class="setting-value"><label class="toggle"><input type="checkbox" id="set-mitm" ${settings.mitm_enabled ? "checked" : ""}/><span class="toggle-slider"></span></label></div>
      </div>
      ${settings.mitm_enabled ? `<div class="setting-row"><span class="setting-label">${t("caCert")}</span><div class="setting-value"><button class="btn-sm" id="btn-install-mitm-ca">${t("installMitmCa")}</button></div></div>` : ''}
      <div class="setting-row"><span class="setting-label">${t("theme")}</span><div class="setting-value"><div class="pill-group">
        <button class="pill-btn ${settings.theme === "dark" ? "active" : ""}" data-theme="dark">${t("dark")}</button>
        <button class="pill-btn ${settings.theme === "auto" ? "active" : ""}" data-theme="auto">${t("auto")}</button>
      </div></div></div>
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
      <div class="setting-row"><span class="setting-label">${t("mixedPort")}</span><div class="setting-value"><input type="number" id="set-port" value="${settings.mihomo_port}"/><span class="edit-icon">✎</span></div></div>
      <div class="setting-row"><span class="setting-label">${t("bindAddr")}</span><div class="setting-value"><input type="text" id="set-bind" value="${settings.socks_addr}"/><span class="edit-icon">✎</span></div></div>
      <div class="setting-row" style="align-items:flex-start">
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
        <input type="text" id="set-custom-dns" value="${esc((settings.custom_dns || []).join(", "))}" placeholder="77.88.8.8, 8.8.8.8" style="width:100%;box-sizing:border-box"/>
        <span style="font-size:11px;opacity:.5">${t("dnsCommaSep")}</span>
      </div></div>
      <div class="setting-row"><span class="setting-label">${t("vpnDns")}</span><div class="setting-value" style="flex-direction:column;align-items:stretch;gap:6px">
        <div class="pill-group" style="flex-wrap:wrap;gap:4px">${vpnDnsPills}</div>
        <input type="text" id="set-vpn-dns" value="${esc(vpnDnsVal)}" placeholder="1.1.1.1:53" style="width:100%;box-sizing:border-box"/>
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
          <input type="text" id="set-socks-user" value="${esc(settings.socks_user || '')}" placeholder="${t("socksUser")}" autocomplete="off" style="width:100%;box-sizing:border-box"/>
          <div style="display:flex;gap:4px;align-items:center">
            <input type="password" id="set-socks-pass" value="${esc(settings.socks_pass || '')}" placeholder="${t("socksPass")}" autocomplete="new-password" style="flex:1;box-sizing:border-box"/>
            <button class="btn-sm" id="btn-toggle-socks-pass" style="flex-shrink:0">👁</button>
          </div>
          ${(settings.socks_user || settings.socks_pass) ? `<div style="font-size:11px;opacity:.5;word-break:break-all;display:flex;align-items:center;gap:4px"><span id="socks-proxy-url">socks5://${esc(settings.socks_user||'')}:${esc(settings.socks_pass||'')}@127.0.0.1:${settings.mihomo_port}</span><button class="btn-sm" id="btn-copy-socks-url" style="flex-shrink:0">${t("copy")}</button></div>` : ''}
          <button class="btn-sm" id="btn-save-socks-auth" style="align-self:flex-end">${t("socksSave")}</button>
        </div>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">${t("advanced")}</div>
      <div class="setting-row" style="align-items:center">
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">
          <span class="setting-label">${t("mitmInspection")}</span>
          <span style="font-size:11px;opacity:.5;font-weight:400">${t("mitmDesc")}</span>
        </div>
        <div class="setting-value"><label class="toggle"><input type="checkbox" id="set-mitm" ${settings.mitm_enabled ? "checked" : ""}/><span class="toggle-slider"></span></label></div>
      </div>
      <div class="setting-row"><span class="setting-label">${t("ipSpoofing")}</span><div class="setting-value" style="flex-direction:column;align-items:stretch;gap:4px">
        <input type="text" id="set-spoof-ips" value="${esc(settings.spoof_ips || '')}" placeholder="192.168.1.10, 192.168.1.11" style="width:100%;box-sizing:border-box"/>
        <span style="font-size:11px;opacity:.5">${t("spoofIpsHint")}</span>
      </div></div>
      ${settings.mitm_enabled ? `<div class="setting-row"><span class="setting-label">${t("caCert")}</span><div class="setting-value"><button class="btn-sm" id="btn-install-mitm-ca">${t("installMitmCa")}</button></div></div>` : ''}
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
    `;
}

function bindSettingsEvents(): void {
  (document.getElementById("set-port") as HTMLInputElement)?.addEventListener("change", function () { settings.mihomo_port = parseInt(this.value, 10) || 7890; persistSettings(); });
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
  document.getElementById("btn-install-mitm-ca")?.addEventListener("click", () => {
    invoke("install_mitm_ca")
      .then(() => showToast(t("caCert") + " OK", "success", 3000))
      .catch((e: unknown) => showToast(String(e), "error", 5000));
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
    renderPage();
  });
  document.getElementById("btn-copy-socks-url")?.addEventListener("click", () => {
    const url = (document.getElementById("socks-proxy-url") as HTMLElement | null)?.textContent ?? "";
    clipboardWrite(url);
  });

  (document.getElementById("set-mitm") as HTMLInputElement)?.addEventListener("change", function () {
    settings.mitm_enabled = this.checked;
    persistSettings();
    if (isConnected) showToast(t("reconnectToApply"), "info", 3000);
    renderPage();
  });
  (document.getElementById("set-spoof-ips") as HTMLInputElement)?.addEventListener("change", function () {
    settings.spoof_ips = this.value.trim();
    persistSettings();
    if (isConnected) showToast(t("reconnectToApply"), "info", 3000);
  });
  const toggles: [string, keyof AppSettings][] = [["set-dns", "dns_redirect"], ["set-ipv6", "ipv6"], ["set-hwid", "hwid"], ["set-autostart", "auto_connect"], ["set-authtip", "auth_tip"], ["set-bypass-ru", "bypass_ru"], ["set-allow-lan", "allow_lan"]];
  toggles.forEach(([id, key]) => { (document.getElementById(id) as HTMLInputElement)?.addEventListener("change", function () { (settings as any)[key] = this.checked; persistSettings(); }); });
  document.getElementById("btn-copy-secret")?.addEventListener("click", () => {
    clipboardWrite(settings.secret);
    showToast(t("secretCopied"), "success", 1800);
  });
  document.getElementById("btn-encapsulate")?.addEventListener("click", async () => {
    const outer = (document.getElementById("encap-outer") as HTMLSelectElement)?.value;
    const inner = (document.getElementById("encap-inner") as HTMLSelectElement)?.value;
    if (!outer || !inner || outer === inner) {
      showToast(t("selectTwoConns"), "error", 2000);
      return;
    }
    await invoke("close_connection", { id: inner }).catch(() => {});
    showToast(`${inner} ${t("encapsulatedIn")} ${outer}`, "success", 3000);
    await fetchConnections();
    renderPage();
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

let _selectedBridge: BridgeInfo | null = null;
let _bridgeTab: "all" | "white" | "black" = "all";
let _mapScale = 1.0;
let _mapOffsetX = 0;
let _mapOffsetY = 0;
let _mapDragging = false;
let _mapDragStartX = 0;
let _mapDragStartY = 0;
let _mapDragOriginX = 0;
let _mapDragOriginY = 0;
let _bridgePingInProgress = false;
let _bridgeRolloutInProgress = false;
let _bridgeMapAC: AbortController | null = null;

function _mlScoreColor(score: number): string {
  if (score >= 75) return "#4ade80";
  if (score >= 50) return "#fbbf24";
  return "#f87171";
}

function _bridgeRow(b: BridgeInfo): string {
  const isWhite = b.type === "white";
  const loadPct = b.load != null ? Math.round(b.load) : null;
  const loadColor = loadPct != null ? (loadPct > 80 ? "#f87171" : loadPct > 50 ? "#fbbf24" : "#4ade80") : "var(--text-muted)";
  const typeBadge = b.blacklisted
    ? '<span class="bridge-badge black">BLACK</span>'
    : isWhite
    ? '<span class="bridge-badge white">WHITE</span>'
    : '<span class="bridge-badge">PUBLIC</span>';
  const latColor = b.latency_ms == null ? "var(--text-muted)" : b.latency_ms < 80 ? "#4ade80" : b.latency_ms < 200 ? "#fbbf24" : "#f87171";
  const location = esc(b.city || b.region || b.country || "—");
  const mlLine = b.ml_score != null
    ? `<span class="bc-ml" style="color:${_mlScoreColor(b.ml_score)}" title="${esc(b.ml_reason || "")}">ML ${Math.round(b.ml_score)}</span>`
    : "";
  const lossChip = b.loss_pct != null && b.loss_pct > 0
    ? `<span class="bc-chip" style="color:${b.loss_pct > 20 ? "#f87171" : "#fbbf24"}">${b.loss_pct.toFixed(0)}% loss</span>`
    : "";

  return `
    <div class="bridge-card${b.blacklisted ? " blacklisted" : ""}${isWhite ? " bc-white" : ""}" data-id="${esc(b.id)}">
      <span class="bridge-dot ${b.alive ? "alive" : "dead"}"></span>
      <div class="bc-body">
        <div class="bc-top">
          ${b.name ? `<span class="bc-name">${esc(b.name)}</span>` : ""}
          <span class="bc-loc">${location}</span>
          ${typeBadge}
          ${mlLine}
        </div>
        <div class="bc-metrics">
          <span class="bc-chip" style="color:${latColor}">${b.latency_ms != null ? b.latency_ms + " ms" : "—"}</span>
          ${loadPct != null ? `<span class="bc-chip" style="color:${loadColor}">${loadPct}% load</span>` : ""}
          ${b.distance_km != null ? `<span class="bc-chip">${b.distance_km} km</span>` : ""}
          ${lossChip}
        </div>
      </div>
      <button class="btn-sm btn-bridge-connect" data-id="${esc(b.id)}">${t("bridgeConnect")}</button>
    </div>`;
}

function _filteredBridges(): BridgeInfo[] {
  if (_bridgeTab === "white") return bridgeList.filter(b => b.type === "white");
  if (_bridgeTab === "black") return bridgeList.filter(b => b.blacklisted);
  return bridgeList;
}

function renderBridges(): string {
  const white = bridgeList.filter(b => b.type === "white").length;
  const black = bridgeList.filter(b => b.blacklisted).length;
  const filtered = _filteredBridges();
  const cards = filtered.map(b => _bridgeRow(b)).join("")
    || `<div class="empty-state" style="padding:32px 0">
         <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.25;margin-bottom:10px"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
         <p style="opacity:.4;font-size:13px">${t("noBridges")}</p>
       </div>`;

  return `
    <div class="page-header" style="margin-bottom:12px">
      <h2 class="page-title">${t("bridgesTitle2")}</h2>
      <div class="btn-group">
        <button class="btn-group-item" id="btn-bridges-refresh" title="${t("bridgeRefreshTip")}">${ICONS.refresh}</button>
        <button class="btn-group-item${_bridgePingInProgress ? " loading" : ""}" id="btn-bridge-scan-ping" title="${t("bridgePingAllTip")}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span style="pointer-events:none">Ping</span>
        </button>
        <button class="btn-group-item" id="btn-bridge-ml-best" title="${t("bridgeMLExpertTip") || "ML ranking"}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
          <span style="pointer-events:none">ML</span>
        </button>
      </div>
    </div>

    <div class="bridge-toolbar">
      <input class="bridge-search-input" id="bridge-search" placeholder="${t("bridgeSearchPlaceholder")}" />
      <div class="bridge-tabs">
        <button class="bridge-tab${_bridgeTab === "all" ? " active" : ""}" data-tab="all">${t("bridgesAllTab")} <span class="bridge-tab-count">${bridgeList.length}</span></button>
        <button class="bridge-tab${_bridgeTab === "white" ? " active" : ""}" data-tab="white">${t("bridgeTabWhite")} <span class="bridge-tab-count">${white}</span></button>
        ${black > 0 ? `<button class="bridge-tab${_bridgeTab === "black" ? " active" : ""}" data-tab="black">${t("bridgeTabBlocked")} <span class="bridge-tab-count">${black}</span></button>` : ""}
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;margin-bottom:10px;min-height:60px">
      <div id="bridge-table">${cards}</div>
    </div>

    <div id="bridge-details-panel" style="display:none"></div>

    <div class="card" style="padding:0;overflow:hidden">
      <div class="bridge-map-hdr" id="bridge-map-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px;cursor:pointer;user-select:none">
        <span style="font-size:12px;font-weight:600;opacity:.7">${t("bridgeLocationMap")}</span>
        <span id="bridge-map-arrow" style="font-size:11px;opacity:.4">▼</span>
      </div>
      <div id="bridge-map-body" style="display:none">
        <div class="bridge-map-wrap" style="border-radius:0;border:none">
          <div class="bridge-map-controls">
            <button class="map-ctrl-btn" id="map-zoom-in">+</button>
            <button class="map-ctrl-btn" id="map-zoom-out">−</button>
            <button class="map-ctrl-btn" id="map-zoom-reset">⊙</button>
          </div>
          <canvas id="bridge-map-canvas" style="cursor:grab"></canvas>
          <div class="bridge-map-tooltip" id="bridge-tooltip" style="display:none"></div>
          <div class="bridge-popup" id="bridge-popup" style="display:none">
            <div class="bridge-popup-header">
              <span class="bridge-popup-name" id="bridge-popup-name"></span>
              <button class="bridge-popup-close" id="bridge-popup-close">${ICONS.x}</button>
            </div>
            <div class="bridge-popup-latency" id="bridge-popup-latency"></div>
            <button class="btn-connect bridge-popup-btn" id="bridge-popup-connect">${ICONS.bolt} ${t("bridgeConnect")}</button>
          </div>
        </div>
      </div>
    </div>

    <div id="bridge-ssh-panel" style="display:none" class="card" style="margin-top:12px">
      <div class="card-header"><span class="card-title">${t("bridgeSSHTitle") || "SSH Key"}</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;padding-top:4px">
        <div class="modal-field" style="margin:0;flex:1;min-width:100px">
          <label>${t("bridgeSSHUser") || "User ID"}</label>
          <input id="bridge-ssh-user" placeholder="user123" />
        </div>
        <div class="modal-field" style="margin:0;width:80px">
          <label>TTL (h)</label>
          <input id="bridge-ssh-ttl" type="number" value="1" min="1" max="720" />
        </div>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);padding-bottom:2px">
          <input id="bridge-ssh-onetime" type="checkbox" checked /> One-time
        </label>
        <button class="btn-sm" id="btn-bridge-issue-key" style="margin-bottom:1px">${t("bridgeSSHIssue") || "Issue"}</button>
      </div>
      <div id="bridge-ssh-result" style="margin-top:10px;font-size:11px;font-family:monospace;color:#4ade80;word-break:break-all;display:none"></div>
    </div>

    <div id="bridge-rollout-panel" style="display:none" class="card" style="margin-top:12px">
      <div class="card-header"><span class="card-title">${t("bridgeRolloutTitle") || "Rollout"}</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;padding-top:4px">
        <div class="modal-field" style="margin:0;width:90px"><label>${t("bridgeVersionLabel")}</label><input id="rollout-version" placeholder="2.1.7" /></div>
        <div class="modal-field" style="margin:0;flex:2;min-width:160px"><label>URL</label><input id="rollout-url" placeholder="https://…" /></div>
        <div class="modal-field" style="margin:0;flex:1;min-width:100px"><label>SHA256</label><input id="rollout-checksum" placeholder="abc123…" /></div>
        <button class="btn-sm${_bridgeRolloutInProgress ? " loading" : ""}" id="btn-bridge-rollout" style="margin-bottom:1px">${t("bridgeRolloutBtn") || "Deploy"}</button>
      </div>
      <div id="rollout-result" style="margin-top:8px;font-size:11px;color:var(--text-muted);display:none"></div>
    </div>`;
}

const LAT_MAX = 80;
const LAT_MIN = -58;
const LAT_RANGE = LAT_MAX - LAT_MIN;

function _drawBridgeMap(bridges: BridgeInfo[], selected: BridgeInfo | null): void {
  const canvas = document.getElementById("bridge-map-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const wrap = canvas.parentElement!;
  const W = wrap.clientWidth || 600;
  const H = Math.round(W / (360 / LAT_RANGE));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#080c14";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  // Apply zoom/pan transform
  ctx.translate(_mapOffsetX, _mapOffsetY);
  ctx.scale(_mapScale, _mapScale);

  const baseW = W / _mapScale;
  const baseH = H / _mapScale;
  const lonX = (lon: number) => ((lon + 180) / 360) * baseW;
  const latY = (lat: number) => ((LAT_MAX - lat) / LAT_RANGE) * baseH;

  function buildPath(geom: any): Path2D {
    const p = new Path2D();
    const drawRing = (ring: number[][]) => {
      for (let i = 0; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        if (i === 0) {
          p.moveTo(lonX(lon), latY(lat));
        } else {
          const prevLon = ring[i - 1][0];
          if (Math.abs(lon - prevLon) > 180) {
            p.moveTo(lonX(lon), latY(lat));
          } else {
            p.lineTo(lonX(lon), latY(lat));
          }
        }
      }
      p.closePath();
    };
    if (geom.type === "Polygon") {
      geom.coordinates.forEach(drawRing);
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates.forEach((poly: number[][][]) => poly.forEach(drawRing));
    }
    return p;
  }

  const landPath = new Path2D();
  const geo = _landGeo as any;
  const features: any[] = geo.type === "FeatureCollection" ? geo.features : [geo];
  features.forEach(f => {
    const sub = buildPath(f.geometry ?? f);
    landPath.addPath(sub);
  });

  ctx.fillStyle = "rgba(88,108,150,0.22)";
  ctx.fill(landPath);
  ctx.strokeStyle = "rgba(140,165,210,0.45)";
  ctx.lineWidth = 0.6;
  ctx.stroke(landPath);

  bridges.forEach(b => {
    if (!b.lat && !b.lon) return;
    const x = lonX(b.lon);
    const y = latY(b.lat);
    const isSel = selected?.id === b.id;
    const isWhite = b.type === "white";
    const aliveColor = isWhite ? "#a78bfa" : "#4ade80";
    const color = b.alive ? (isSel ? "#00e5ff" : aliveColor) : "#f87171";
    const r = isSel ? 8 : (isWhite ? 6 : 5);

    if (isSel) {
      ctx.strokeStyle = "rgba(0,229,255,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(0,229,255,0.15)";
      ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.shadowColor = color + "bb";
    ctx.shadowBlur = isSel ? 18 : 10;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isWhite ? "rgba(167,139,250,0.6)" : "rgba(0,0,0,0.55)";
    ctx.lineWidth = isWhite ? 2 : 1.5;
    ctx.stroke();

    if (isWhite && !isSel) {
      ctx.strokeStyle = "rgba(167,139,250,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke();
    }

    const label = b.name || b.city || "";
    if (label) {
      ctx.save();
      ctx.font = isSel ? "bold 10px sans-serif" : "10px sans-serif";
      ctx.fillStyle = isSel ? "#00e5ff" : "rgba(210,220,255,0.75)";
      ctx.textAlign = "center";
      ctx.shadowBlur = 0;
      ctx.fillText(label, x, y + r + 10);
      ctx.restore();
    }
  });

  (canvas as any)._bridges = bridges;
  // Store coordinate functions that account for zoom/pan
  (canvas as any)._lonX = (lon: number) => lonX(lon) * _mapScale + _mapOffsetX;
  (canvas as any)._latY = (lat: number) => latY(lat) * _mapScale + _mapOffsetY;
}

function _showBridgePopup(b: BridgeInfo): void {
  _selectedBridge = b;
  const popup = document.getElementById("bridge-popup");
  const nameEl = document.getElementById("bridge-popup-name");
  const latEl = document.getElementById("bridge-popup-latency");
  if (!popup || !nameEl || !latEl) return;
  const loc = b.city ? `${b.city}, ${b.country || ""}` : (b.region || b.country || b.id);
  const typeLabel = b.blacklisted ? " [BLACK]" : b.type === "white" ? " [WHITE]" : "";
  nameEl.textContent = (b.name ? b.name + " — " : "") + loc + typeLabel;
  const details: string[] = [];
  if (b.latency_ms) details.push("🏓 " + b.latency_ms + " ms");
  if (b.distance_km != null) details.push("📍 " + b.distance_km + " km");
  if (b.load != null) details.push("load: " + Math.round(b.load) + "%");
  if (b.cur_users != null) details.push(b.cur_users + (b.max_users ? "/" + b.max_users : "") + " users");
  if (b.loss_pct != null && b.loss_pct > 0) details.push("loss: " + b.loss_pct.toFixed(1) + "%");
  latEl.textContent = details.join(" · ");
  popup.style.display = "flex";

  // Show details panel
  _showBridgeDetailsPanel(b);

  _drawBridgeMap(bridgeList, b);
}

function _showBridgeDetailsPanel(b: BridgeInfo): void {
  const panel = document.getElementById("bridge-details-panel");
  if (!panel) return;
  const typeColor = b.blacklisted ? "#f87171" : b.type === "white" ? "#a78bfa" : "#4ade80";
  const typeName = b.blacklisted ? "BLACKLISTED" : b.type === "white" ? "WHITE" : b.type?.toUpperCase() || "PUBLIC";
  panel.innerHTML = `
    <div class="bridge-details-card">
      <div class="bridge-details-header">
        <span style="font-weight:600;font-size:13px">${esc(b.name || b.city || b.id)}</span>
        <span class="bridge-badge" style="background:${typeColor}20;color:${typeColor};border-color:${typeColor}50">${typeName}</span>
        ${b.alive ? '<span class="badge-on" style="font-size:10px">ONLINE</span>' : '<span class="badge-off" style="font-size:10px">OFFLINE</span>'}
      </div>
      <div class="bridge-details-grid">
        <div class="bridge-detail-item"><span class="bdl">ID</span><span class="bdv" style="font-size:10px;font-family:monospace">${esc(b.id)}</span></div>
        <div class="bridge-detail-item"><span class="bdl">${t("bridgesAlive") || "Статус"}</span><span class="bdv">${b.alive ? "Online" : "Offline"}</span></div>
        <div class="bridge-detail-item"><span class="bdl">Ping</span><span class="bdv">${b.latency_ms ? b.latency_ms + " ms" : "—"}</span></div>
        <div class="bridge-detail-item"><span class="bdl">Loss</span><span class="bdv" style="color:${b.loss_pct && b.loss_pct > 10 ? "#f87171" : "inherit"}">${b.loss_pct != null ? b.loss_pct.toFixed(1) + "%" : "—"}</span></div>
        <div class="bridge-detail-item"><span class="bdl">${t("bridgeLoad") || "Нагрузка"}</span><span class="bdv">${b.load != null ? Math.round(b.load) + "%" : "—"}</span></div>
        <div class="bridge-detail-item"><span class="bdl">${t("bridgeUsers") || "Пользователи"}</span><span class="bdv">${b.cur_users != null ? b.cur_users + (b.max_users ? "/" + b.max_users : "") : "—"}</span></div>
        <div class="bridge-detail-item"><span class="bdl">${t("bridgeBW") || "Пропускная"}</span><span class="bdv">${b.bandwidth_mbps ? b.bandwidth_mbps + " Mbps" : "—"}</span></div>
        <div class="bridge-detail-item"><span class="bdl">${t("bridgeLocation") || "Локация"}</span><span class="bdv">${esc([b.city, b.region, b.country].filter(Boolean).join(", ") || "—")}</span></div>
        <div class="bridge-detail-item"><span class="bdl">${t("bridgeProvider") || "Провайдер"}</span><span class="bdv">${esc(b.provider || "—")}</span></div>
        <div class="bridge-detail-item"><span class="bdl">${t("bridgeVersion") || "Версия"}</span><span class="bdv">${esc(b.version || "—")}</span></div>
        ${b.distance_km != null ? `<div class="bridge-detail-item"><span class="bdl">${t("bridgeDist") || "Расстояние"}</span><span class="bdv">${b.distance_km} km</span></div>` : ""}
        ${b.ml_score != null ? `<div class="bridge-detail-item"><span class="bdl">ML Score</span><span class="bdv" style="color:${_mlScoreColor(b.ml_score)}">${Math.round(b.ml_score)}/100</span></div>` : ""}
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        <button class="btn-sm btn-bridge-connect" data-id="${esc(b.id)}">${t("bridgeConnect") || "Подключиться"}</button>
        ${b.type === "white" || b.type === "operator" ? `<button class="btn-sm" id="btn-detail-ping" data-id="${esc(b.id)}">⚡ TCP Ping</button>` : ""}
        ${b.type === "white" ? `<button class="btn-sm" id="btn-detail-ssh" data-id="${esc(b.id)}">🔑 ${t("bridgeSSHTitle") || "SSH ключ"}</button>` : ""}
        <button class="btn-sm" id="btn-detail-label-toggle" data-id="${esc(b.id)}" data-blacklisted="${b.blacklisted ? "1" : "0"}" style="color:${b.blacklisted ? "#f87171" : "#aaa"}">
          ${b.blacklisted ? "✓ Unblacklist" : "⛔ Blacklist"}
        </button>
      </div>
    </div>`;
  panel.style.display = "block";
  _bindDetailsPanelEvents(b);
}

function _updateBridgeTable(): void {
  const filtered = _filteredBridges();
  const rows = filtered.map(b => _bridgeRow(b)).join("")
    || `<div class="empty-state"><p>${t("noBridges")}</p></div>`;
  const table = document.getElementById("bridge-table");
  if (table) table.innerHTML = rows;
  const alive = bridgeList.filter(b => b.alive).length;
  const sa = document.getElementById("bstat-alive"); if (sa) sa.textContent = String(alive);
  const st = document.getElementById("bstat-total"); if (st) st.textContent = String(bridgeList.length);
  requestAnimationFrame(() => {
    if (document.getElementById("bridge-map-body")?.style.display !== "none") {
      _drawBridgeMap(bridgeList, _selectedBridge);
    }
    bindBridgeRowEvents();
  });
}

function _bindDetailsPanelEvents(b: BridgeInfo): void {
  document.getElementById("btn-detail-ping")?.addEventListener("click", async () => {
    const baseURL = getServerBaseURL();
    if (!baseURL) return;
    showToast("Pinging bridge...", "info", 1500);
    try {
      const res = await invoke<Record<string, unknown>>("bridge_ping", {
        bridgeId: b.id,
        count: 5,
        mode: "tcp",
      });
      const loss = res["loss_pct"] as number ?? 0;
      const avg = res["avg_latency"] as number ?? 0;
      showToast(`Ping: ${avg} ms, loss: ${loss.toFixed(0)}%`, loss > 20 ? "error" : "success", 3000);
      const idx = bridgeList.findIndex(x => x.id === b.id);
      if (idx >= 0) {
        bridgeList[idx].loss_pct = loss;
        bridgeList[idx].latency_ms = avg;
      }
      _showBridgeDetailsPanel({ ...b, loss_pct: loss, latency_ms: avg });
    } catch (e) {
      showToast(String(e), "error", 3000);
    }
  });

  document.getElementById("btn-detail-ssh")?.addEventListener("click", () => {
    const panel = document.getElementById("bridge-ssh-panel");
    if (panel) {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      const hiddenId = document.getElementById("bridge-ssh-bridge-id");
      if (!hiddenId) {
        const inp = document.createElement("input");
        inp.type = "hidden";
        inp.id = "bridge-ssh-bridge-id";
        inp.value = b.id;
        panel.appendChild(inp);
      } else {
        (hiddenId as HTMLInputElement).value = b.id;
      }
    }
  });

  document.getElementById("btn-detail-label-toggle")?.addEventListener("click", async () => {
    const newBlacklisted = !b.blacklisted;
    try {
      await invoke<boolean>("bridge_set_label", { bridgeId: b.id, blacklisted: newBlacklisted });
      const idx = bridgeList.findIndex(x => x.id === b.id);
      if (idx >= 0) bridgeList[idx].blacklisted = newBlacklisted;
      showToast(newBlacklisted ? "Bridge blacklisted" : "Bridge unblacklisted", "success", 2000);
      _showBridgeDetailsPanel({ ...b, blacklisted: newBlacklisted });
      _updateBridgeTable();
    } catch (e) {
      showToast(String(e), "error", 3000);
    }
  });
}

function _hideBridgePopup(): void {
  _selectedBridge = null;
  const popup = document.getElementById("bridge-popup");
  if (popup) popup.style.display = "none";
  _drawBridgeMap(bridgeList, null);
}

function bindBridgesEvents(): void {
  _bridgeMapAC?.abort();
  _bridgeMapAC = new AbortController();
  const mapSig = _bridgeMapAC.signal;

  const refresh = async () => {
    _hideBridgePopup();
    const baseURL = getServerBaseURL();
    if (!baseURL) {
      const tbl = document.getElementById("bridge-table");
      if (tbl) tbl.innerHTML = `<div class="empty-state"><p>${t("bridgesNoKey")}</p></div>`;
      return;
    }
    try {
      const res = await fetch(`${baseURL}/api/bridge-map`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      bridgeList = (Array.isArray(data) ? data : (data.bridges || [])) as BridgeInfo[];
      if (userLat !== 0 || userLon !== 0) {
        bridgeList.forEach(b => {
          if (b.lat || b.lon) b.distance_km = haversineKm(userLat, userLon, b.lat, b.lon);
        });
      }
    } catch { bridgeList = []; }
    _updateBridgeTable();
  };

  // Tabs
  document.querySelectorAll<HTMLElement>(".bridge-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      _bridgeTab = (tab.dataset.tab as typeof _bridgeTab) || "all";
      document.querySelectorAll(".bridge-tab").forEach(t2 => t2.classList.remove("active"));
      tab.classList.add("active");
      _updateBridgeTable();
    });
  });

  document.getElementById("btn-bridges-refresh")?.addEventListener("click", refresh);

  document.getElementById("bridge-map-toggle")?.addEventListener("click", () => {
    const body = document.getElementById("bridge-map-body") as HTMLElement;
    const arrow = document.getElementById("bridge-map-arrow") as HTMLElement;
    const open = body.style.display === "none";
    body.style.display = open ? "" : "none";
    arrow.textContent = open ? "▲" : "▼";
    if (open) requestAnimationFrame(() => _drawBridgeMap(bridgeList, _selectedBridge));
  });

  // Resize map when window/container changes size
  const mapWrap = document.querySelector<HTMLElement>(".bridge-map-wrap");
  if (mapWrap) {
    new ResizeObserver(() => {
      if (document.getElementById("bridge-map-body")?.style.display !== "none") {
        _drawBridgeMap(bridgeList, _selectedBridge);
      }
    }).observe(mapWrap);
  }

  document.getElementById("bridge-search")?.addEventListener("input", function () {
    const q = (this as HTMLInputElement).value.toLowerCase();
    document.querySelectorAll<HTMLElement>(".bridge-card").forEach(el => {
      const text = el.textContent?.toLowerCase() || "";
      el.style.display = text.includes(q) ? "" : "none";
    });
  });

  document.getElementById("bridge-popup-close")?.addEventListener("click", _hideBridgePopup);
  document.getElementById("bridge-popup-connect")?.addEventListener("click", () => {
    if (_selectedBridge) connectToBridge(_selectedBridge);
  });

  const mapVisible = () => document.getElementById("bridge-map-body")?.style.display !== "none";

  // Zoom controls
  document.getElementById("map-zoom-in")?.addEventListener("click", () => {
    _mapScale = Math.min(_mapScale * 1.4, 8);
    if (mapVisible()) _drawBridgeMap(bridgeList, _selectedBridge);
  });
  document.getElementById("map-zoom-out")?.addEventListener("click", () => {
    _mapScale = Math.max(_mapScale / 1.4, 0.5);
    if (mapVisible()) _drawBridgeMap(bridgeList, _selectedBridge);
  });
  document.getElementById("map-zoom-reset")?.addEventListener("click", () => {
    _mapScale = 1; _mapOffsetX = 0; _mapOffsetY = 0;
    if (mapVisible()) _drawBridgeMap(bridgeList, _selectedBridge);
  });

  // ML best bridge
  document.getElementById("btn-bridge-ml-best")?.addEventListener("click", async () => {
    if (!_mlStatus || bridgeList.length === 0) {
      showToast(t("bridgesMLNotReady") || "ML not ready", "error", 2500);
      return;
    }
    try {
      const ranked = await invoke<string>("ml_rank_bridges", { bridgesJson: JSON.stringify(bridgeList) });
      const rankedList = JSON.parse(ranked) as BridgeInfo[];
      const scoreMap = new Map(rankedList.map(b => [b.id, b]));
      bridgeList = bridgeList.map(b => {
        const r = scoreMap.get(b.id);
        return r ? { ...b, ml_score: r.ml_score, ml_reason: r.ml_reason } : b;
      });
      bridgeList.sort((a, b) => {
        if (a.alive !== b.alive) return a.alive ? -1 : 1;
        return (b.ml_score ?? 0) - (a.ml_score ?? 0);
      });
      _updateBridgeTable();
      const best = bridgeList.find(b => b.alive && !b.blacklisted);
      if (best) { _showBridgePopup(best); addLog("✦ ML best bridge: " + (best.city || best.id)); }
    } catch { showToast("ML ranking failed", "error", 2500); }
  });

  // Scan + TCP ping all
  document.getElementById("btn-bridge-scan-ping")?.addEventListener("click", async () => {
    if (_bridgePingInProgress) return;
    _bridgePingInProgress = true;
    showToast(t("bridgesPinging") || "Pinging all bridges...", "info", 2000);
    const aliveBridges = bridgeList.filter(b => b.alive && (b.type === "white" || b.type === "operator"));
    let done = 0;
    await Promise.allSettled(aliveBridges.map(async b => {
      try {
        const res = await invoke<Record<string, unknown>>("bridge_ping", { bridgeId: b.id, count: 3, mode: "tcp" });
        const idx = bridgeList.findIndex(x => x.id === b.id);
        if (idx >= 0) {
          bridgeList[idx].loss_pct = res["loss_pct"] as number ?? 0;
          bridgeList[idx].latency_ms = res["avg_latency"] as number ?? bridgeList[idx].latency_ms;
        }
      } catch { /* silent */ }
      done++;
      const sa = document.getElementById("bstat-alive");
      if (sa) sa.title = `Pinged ${done}/${aliveBridges.length}`;
    }));
    _bridgePingInProgress = false;
    _updateBridgeTable();
    showToast(`Pinged ${done} bridges`, "success", 2000);
  });

  // SSH key issuance
  document.getElementById("btn-bridge-issue-key")?.addEventListener("click", async () => {
    const bridgeIdEl = document.getElementById("bridge-ssh-bridge-id") as HTMLInputElement | null;
    const userEl = document.getElementById("bridge-ssh-user") as HTMLInputElement | null;
    const ttlEl = document.getElementById("bridge-ssh-ttl") as HTMLInputElement | null;
    const oneTimeEl = document.getElementById("bridge-ssh-onetime") as HTMLInputElement | null;
    const resultEl = document.getElementById("bridge-ssh-result");
    const bridgeId = bridgeIdEl?.value || _selectedBridge?.id || "";
    if (!bridgeId || !userEl?.value) { showToast("bridge_id and user required", "error", 2500); return; }
    try {
      const data = await invoke<Record<string, unknown>>("bridge_issue_ssh_key", {
        bridgeId,
        userId: userEl.value,
        oneTime: oneTimeEl?.checked ?? true,
        ttlHours: parseInt(ttlEl?.value || "24", 10),
      });
      if (resultEl) {
        resultEl.style.display = "block";
        resultEl.textContent = `Key ID: ${data["key_id"]}\nSSH: ${data["ssh_key"]}\nExpires: ${data["expires_at"]}`;
      }
      showToast("SSH key issued", "success", 2500);
    } catch (e) { showToast(String(e), "error", 3000); }
  });

  // Rollout
  document.getElementById("btn-bridge-rollout")?.addEventListener("click", async () => {
    if (_bridgeRolloutInProgress) return;
    const ver = (document.getElementById("rollout-version") as HTMLInputElement)?.value;
    const url = (document.getElementById("rollout-url") as HTMLInputElement)?.value;
    const chk = (document.getElementById("rollout-checksum") as HTMLInputElement)?.value;
    if (!ver || !url) { showToast("version and url required", "error", 2500); return; }
    _bridgeRolloutInProgress = true;
    showToast(t("bridgeRolloutStarted") || "Rollout started...", "info", 2000);
    try {
      const data = await invoke<Record<string, unknown>>("bridge_rollout", { version: ver, binaryUrl: url, checksum: chk || "" });
      const resultEl = document.getElementById("rollout-result");
      if (resultEl) {
        resultEl.style.display = "block";
        resultEl.textContent = JSON.stringify(data, null, 2);
      }
      showToast(t("bridgeRolloutDone") || "Rollout complete", "success", 3000);
    } catch (e) { showToast(String(e), "error", 3000); }
    _bridgeRolloutInProgress = false;
  });

  // Toggle rollout panel
  document.querySelectorAll<HTMLElement>("[data-toggle='rollout']").forEach(el => {
    el.addEventListener("click", () => {
      const p = document.getElementById("bridge-rollout-panel");
      if (p) p.style.display = p.style.display === "none" ? "block" : "none";
    });
  });

  const canvas = document.getElementById("bridge-map-canvas") as HTMLCanvasElement | null;
  const tooltip = document.getElementById("bridge-tooltip");

  if (canvas && tooltip) {
    // Mouse wheel zoom
    canvas.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const factor = ev.deltaY < 0 ? 1.2 : 1 / 1.2;
      const newScale = Math.max(0.5, Math.min(8, _mapScale * factor));
      // Zoom toward mouse position
      _mapOffsetX = mx - (mx - _mapOffsetX) * (newScale / _mapScale);
      _mapOffsetY = my - (my - _mapOffsetY) * (newScale / _mapScale);
      _mapScale = newScale;
      _drawBridgeMap(bridgeList, _selectedBridge);
    }, { passive: false });

    // Drag to pan
    canvas.addEventListener("mousedown", (ev) => {
      _mapDragging = true;
      _mapDragStartX = ev.clientX;
      _mapDragStartY = ev.clientY;
      _mapDragOriginX = _mapOffsetX;
      _mapDragOriginY = _mapOffsetY;
      canvas.style.cursor = "grabbing";
    });
    window.addEventListener("mouseup", () => {
      if (_mapDragging) {
        _mapDragging = false;
        canvas.style.cursor = "grab";
      }
    }, { signal: mapSig });
    window.addEventListener("mousemove", (ev) => {
      if (!_mapDragging) return;
      _mapOffsetX = _mapDragOriginX + (ev.clientX - _mapDragStartX);
      _mapOffsetY = _mapDragOriginY + (ev.clientY - _mapDragStartY);
      _drawBridgeMap(bridgeList, _selectedBridge);
    }, { signal: mapSig });

    // Touch support for pan/zoom
    let _touchDist = 0;
    canvas.addEventListener("touchstart", (ev) => {
      if (ev.touches.length === 1) {
        _mapDragging = true;
        _mapDragStartX = ev.touches[0].clientX;
        _mapDragStartY = ev.touches[0].clientY;
        _mapDragOriginX = _mapOffsetX;
        _mapDragOriginY = _mapOffsetY;
      } else if (ev.touches.length === 2) {
        _touchDist = Math.hypot(
          ev.touches[0].clientX - ev.touches[1].clientX,
          ev.touches[0].clientY - ev.touches[1].clientY
        );
      }
      ev.preventDefault();
    }, { passive: false });
    canvas.addEventListener("touchmove", (ev) => {
      if (ev.touches.length === 1 && _mapDragging) {
        _mapOffsetX = _mapDragOriginX + (ev.touches[0].clientX - _mapDragStartX);
        _mapOffsetY = _mapDragOriginY + (ev.touches[0].clientY - _mapDragStartY);
        _drawBridgeMap(bridgeList, _selectedBridge);
      } else if (ev.touches.length === 2) {
        const dist = Math.hypot(
          ev.touches[0].clientX - ev.touches[1].clientX,
          ev.touches[0].clientY - ev.touches[1].clientY
        );
        if (_touchDist > 0) {
          _mapScale = Math.max(0.5, Math.min(8, _mapScale * (dist / _touchDist)));
          _drawBridgeMap(bridgeList, _selectedBridge);
        }
        _touchDist = dist;
      }
      ev.preventDefault();
    }, { passive: false });
    canvas.addEventListener("touchend", () => { _mapDragging = false; });

    // Hover tooltip
    canvas.addEventListener("mousemove", (ev) => {
      if (_mapDragging) return;
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const bs: BridgeInfo[] = (canvas as any)._bridges || [];
      const lonX: (l: number) => number = (canvas as any)._lonX;
      const latY: (l: number) => number = (canvas as any)._latY;
      if (!lonX) return;
      let hit: BridgeInfo | null = null;
      for (const b of bs) {
        if (!b.lat && !b.lon) continue;
        if (Math.hypot(lonX(b.lon) - mx, latY(b.lat) - my) < 10) { hit = b; break; }
      }
      if (hit) {
        tooltip.style.display = "block";
        tooltip.style.left = (mx + 14) + "px";
        tooltip.style.top = (my - 10) + "px";
        const label = hit.name ? `${hit.name} · ${hit.city || hit.country || hit.id}` : (hit.city || hit.region || hit.country || hit.id);
        const parts = [label];
        if (hit.blacklisted) parts.push("⛔ BLACK");
        else if (hit.type === "white") parts.push("⚡ WHITE");
        if (hit.latency_ms) parts.push(hit.latency_ms + " ms");
        if (hit.loss_pct != null && hit.loss_pct > 0) parts.push("loss: " + hit.loss_pct.toFixed(0) + "%");
        if (hit.distance_km != null) parts.push(hit.distance_km + " km");
        if (hit.load != null) parts.push("load: " + Math.round(hit.load) + "%");
        if (hit.cur_users != null) parts.push(hit.cur_users + (hit.max_users ? "/" + hit.max_users : "") + " users");
        tooltip.textContent = parts.join(" · ");
        canvas.style.cursor = "pointer";
      } else {
        tooltip.style.display = "none";
        canvas.style.cursor = "grab";
      }
    });
    canvas.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });
    canvas.addEventListener("click", (ev) => {
      if (_mapDragging) return;
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const bs: BridgeInfo[] = (canvas as any)._bridges || [];
      const lonX: (l: number) => number = (canvas as any)._lonX;
      const latY: (l: number) => number = (canvas as any)._latY;
      if (!lonX) return;
      for (const b of bs) {
        if (!b.lat && !b.lon) continue;
        if (Math.hypot(lonX(b.lon) - mx, latY(b.lat) - my) < 10) {
          _showBridgePopup(b);
          tooltip.style.display = "none";
          return;
        }
      }
      _hideBridgePopup();
    });
  }

  refresh();
}

function bindBridgeRowEvents(): void {
  document.querySelectorAll<HTMLElement>(".btn-bridge-connect").forEach(el => {
    el.addEventListener("click", () => {
      const b = bridgeList.find(x => x.id === el.dataset.id);
      if (b) connectToBridge(b);
    });
  });
}

async function connectToBridge(b: BridgeInfo): Promise<void> {
  const baseURL = getServerBaseURL();
  if (!baseURL) return;
  showToast(t("bridgesConnecting"), "info", 2000);
  try {
    const res = await fetch(`${baseURL}/api/bridge-connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bridge_id: b.id }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const conn = data.connection || data;
    if (conn.conn_key || conn.address) {
      settings.conn_key = conn.conn_key || `whispera://${conn.address}?pubkey=${conn.public_key || ""}`;
      await persistSettings();
      showToast(t("bridgesConnected"), "success", 2500);
      currentPage = "home";
      renderNav();
      renderPage();
    } else {
      showToast(t("bridgeNoConnData"), "error", 3000);
    }
  } catch (e) {
    showToast(String(e), "error", 4000);
  }
}

let _mlStatus = false;
let _mlBinaryExists = false;
let _mlLogs = "";
let _mlLogsInterval: ReturnType<typeof setInterval> | null = null;
let _mlNetworkAnalysis: MLNetworkAnalysis | null = null;
let _mlTransportRec: MLTransportRecommendation | null = null;
let _mlAnalyzing = false;
let _mlTargetServer = "";
let _mlToken = "";
let _mlTokenInvalid = false;
const _mlEndpoint = localStorage.getItem("ml_endpoint") || "http://127.0.0.1:8000";

async function _mlFetch(path: string, init?: RequestInit): Promise<Response> {
  // /health is always allowed by the server without auth — don't block it
  if (_mlTokenInvalid && path !== "/health") return new Response(null, { status: 401 });
  const opts: RequestInit = { ...init, headers: { ...((init?.headers as Record<string, string>) || {}) } };
  if (_mlToken) (opts.headers as Record<string, string>)["Authorization"] = `Bearer ${_mlToken}`;
  const res = await fetch(`${_mlEndpoint}${path}`, opts);
  if (res.status === 401 && !_mlTokenInvalid) {
    _mlTokenInvalid = true;
    showToast(t("mlInvalidToken"), "error", 5000);
  }
  return res;
}
let _mlTraining = false;
let _mlTrainProgress = 0;
let _mlTrainEpoch = 0;
let _mlTrainLoss = 0;
let _mlTrainStatus = "";
let _mlDatasets: {name: string; size: number; modified: number}[] = [];
let _mlFeedbackStats: Record<string, {success: number; fail: number; total: number; total_latency: number; count: number}> = {};
let _mlModelInfo: {accuracy: number; parameters: number; samples: number; engine: string} | null = null;

async function refreshMLState(): Promise<void> {
  try { _mlStatus = await invoke<boolean>("get_ml_status"); } catch { _mlStatus = false; }
  try { _mlBinaryExists = await invoke<boolean>("ml_binary_exists"); } catch { _mlBinaryExists = false; }
  try { _mlLogs = await invoke<string>("get_ml_logs"); } catch { _mlLogs = ""; }
}

function _dpiRiskBadge(risk: string): string {
  const map: Record<string, [string, string]> = {
    low:      ["badge-on",  t("mlDpiLow")],
    medium:   ["badge-warn", t("mlDpiMedium")],
    high:     ["badge-off", t("mlDpiHigh")],
    critical: ["badge-off", t("mlDpiCritical")],
  };
  const [cls, label] = map[risk] ?? ["badge-off", risk];
  return `<span class="${cls}">${label}</span>`;
}

function renderMLSection(): string {
  const statusClass = _mlStatus ? "badge-on" : "badge-off";
  const statusText  = _mlStatus ? t("mlRunning") : t("mlStopped");
  const modeText    = _mlStatus ? t("mlFallbackOff") : t("mlFallbackOn");
  const modeClass   = _mlStatus ? "badge-on" : "badge-off";

  let analysisCard: string;
  if (_mlNetworkAnalysis) {
    const a = _mlNetworkAnalysis;
    const rec = _mlTransportRec;
    analysisCard = `
      <div class="card" style="margin-bottom:12px">
        <div class="card-header">
          <span class="card-title">${t("mlNetworkAnalysis")}</span>
          <button class="btn-sm" id="btn-ml-analyze" ${_mlAnalyzing ? "disabled" : ""}>${_mlAnalyzing ? t("mlAnalyzing") : t("mlRunAnalysis")}</button>
        </div>
        <div class="info-row"><span class="info-label">${t("mlDpiRisk")}</span><span class="info-value" id="ml-dpi-risk">${_dpiRiskBadge(a.dpi_risk)}</span></div>
        <div class="info-row"><span class="info-label">${t("mlAvgRtt")}</span><span class="info-value">${a.avg_rtt_ms != null ? a.avg_rtt_ms + " ms" : "—"}</span></div>
        <div class="info-row"><span class="info-label">${t("mlReachable")}</span><span class="info-value">${a.reachable} / ${a.total_probed}</span></div>
        ${rec ? `
        <div class="info-row" style="margin-top:6px">
          <span class="info-label">${t("mlTransportRec")}</span>
          <span class="info-value"><span class="badge-on">${esc(rec.transport)}</span></span>
        </div>
        <div class="info-row">
          <span class="info-label">${t("mlTransportDesc")}</span>
          <span class="info-value" style="font-size:12px;opacity:0.75">${esc(rec.description)}</span>
        </div>` : ""}
      </div>`;
  } else {
    analysisCard = `
      <div class="card" style="margin-bottom:12px">
        <div class="card-header">
          <span class="card-title">${t("mlNetworkAnalysis")}</span>
          <button class="btn-sm" id="btn-ml-analyze" ${_mlAnalyzing || !_mlStatus ? "disabled" : ""}>${_mlAnalyzing ? t("mlAnalyzing") : t("mlRunAnalysis")}</button>
        </div>
        <div class="empty-state" style="padding:16px 0"><p id="ml-analysis-hint" style="opacity:0.5">${_mlStatus ? t("mlScanFirst") : t("mlStopped") + " — " + t("mlStart")}</p></div>
      </div>`;
  }

  return `
    <div style="margin-top:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h3 style="margin:0;font-size:15px;opacity:0.85">${t("mlTitle")}</h3>
        <button class="btn-sm" id="btn-ml-refresh-logs">${ICONS.refresh} ${t("mlRefreshLogs")}</button>
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="card-header"><span class="card-title">${t("mlServer")}</span></div>
        <div class="info-row">
          <span class="info-label">${t("mlStatus")}</span>
          <span class="info-value"><span class="${statusClass}" id="ml-status-badge">${statusText}</span></span>
        </div>
        <div class="info-row">
          <span class="info-label">${t("mlFallback")}</span>
          <span class="info-value"><span class="${modeClass}" id="ml-mode-badge">${modeText}</span></span>
        </div>
        <div class="info-row" id="ml-no-binary-row" style="${!_mlBinaryExists && !_mlStatus ? "" : "display:none"}"><span style="color:#f87171;font-size:12px">${t("mlNoBinary")}</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button class="btn-sm" id="btn-ml-start"   ${_mlStatus || !_mlBinaryExists ? "disabled" : ""}>${t("mlStart")}</button>
          <button class="btn-sm" id="btn-ml-stop"    ${!_mlStatus ? "disabled" : ""}>${t("mlStop")}</button>
          <button class="btn-sm" id="btn-ml-restart" ${!_mlBinaryExists ? "disabled" : ""}>${t("mlRestart")}</button>
        </div>
      </div>

      ${analysisCard}


      <div class="card" style="margin-bottom:12px">
        <div class="card-header">
          <span class="card-title">${t("mlTraining")}</span>
          <button class="btn-sm" id="btn-ml-train" ${!_mlStatus ? "disabled" : ""}>${_mlTraining ? t("mlTrainStop") : t("mlTrainStart")}</button>
        </div>
        ${_mlTraining ? `
          <div style="margin-top:8px">
            <div class="info-row"><span class="info-label">${t("mlTrainEpoch")}</span><span class="info-value" id="ml-train-epoch">${_mlTrainEpoch}</span></div>
            <div class="info-row"><span class="info-label">${t("mlTrainLoss")}</span><span class="info-value" id="ml-train-loss">${_mlTrainLoss.toFixed(6)}</span></div>
            <div class="info-row"><span class="info-label">${t("mlTrainProgress")}</span><span class="info-value" id="ml-train-pct">${_mlTrainProgress}%</span></div>
            <div style="margin-top:8px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden">
              <div id="ml-train-bar" style="height:100%;width:${_mlTrainProgress}%;background:var(--accent);transition:width 0.3s"></div>
            </div>
          </div>` : `
          <div class="empty-state" style="padding:12px 0"><p style="opacity:0.4">${_mlTrainStatus || t("mlTrainClickHint")}</p></div>`}
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="card-header"><span class="card-title">${t("mlFederated")}</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
          <button class="btn-sm" id="btn-ml-fed-export" ${!_mlStatus ? "disabled" : ""}>${t("mlFedExport")}</button>
          <button class="btn-sm" id="btn-ml-fed-import" ${!_mlStatus ? "disabled" : ""}>${t("mlFedImport")}</button>
          <button class="btn-sm" id="btn-ml-fed-losses" ${!_mlStatus ? "disabled" : ""}>${t("mlFedLosses")}</button>
        </div>
        <div id="ml-fed-output" style="margin-top:8px;font-size:12px;font-family:monospace;max-height:150px;overflow-y:auto"></div>
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="card-header">
          <span class="card-title">${t("mlModelMgmt")}</span>
          <button class="btn-sm" id="btn-ml-model-reload" ${!_mlStatus ? "disabled" : ""}>${t("mlModelReload")}</button>
        </div>
        ${_mlModelInfo ? `
          <div class="info-row"><span class="info-label">${t("mlModelEngine")}</span><span class="info-value"><span class="badge-on">${esc(_mlModelInfo.engine)}</span></span></div>
          <div class="info-row"><span class="info-label">${t("mlModelAccuracy")}</span><span class="info-value">${(_mlModelInfo.accuracy * 100).toFixed(1)}%</span></div>
          <div class="info-row"><span class="info-label">${t("mlModelParams")}</span><span class="info-value">${_mlModelInfo.parameters.toLocaleString()}</span></div>
          <div class="info-row"><span class="info-label">${t("mlModelSamples")}</span><span class="info-value">${_mlModelInfo.samples.toLocaleString()}</span></div>
        ` : `<div class="empty-state" style="padding:12px 0"><p style="opacity:0.4">—</p></div>`}
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="card-header">
          <span class="card-title">${t("mlFeedback")}</span>
          <button class="btn-sm" id="btn-ml-fb-refresh" ${!_mlStatus ? "disabled" : ""}>${ICONS.refresh}</button>
        </div>
        ${Object.keys(_mlFeedbackStats).length > 0 ? `
          <div style="font-size:12px;margin-top:8px">
            ${Object.entries(_mlFeedbackStats).map(([name, st]) => `
              <div style="display:flex;gap:8px;padding:3px 0;align-items:center">
                <span style="flex:2;font-family:monospace">${esc(name)}</span>
                <span style="flex:1;color:#4ade80">${t("mlFbSuccess")}: ${st.success}</span>
                <span style="flex:1;color:#f87171">${t("mlFbFail")}: ${st.fail}</span>
                <span style="flex:1;opacity:0.6">${t("mlFbTotal")}: ${st.total}</span>
                <span style="flex:1;opacity:0.6">${st.count > 0 ? (st.total_latency / st.count).toFixed(0) + "ms" : "—"}</span>
              </div>
            `).join("")}
          </div>` : `<div class="empty-state" style="padding:12px 0"><p style="opacity:0.4">${t("mlFbNoData")}</p></div>`}
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="card-header">
          <span class="card-title">${t("mlDatasets")}</span>
          <div style="display:flex;gap:4px">
            <button class="btn-sm" id="btn-ml-ds-export" ${!_mlStatus ? "disabled" : ""}>${t("mlDsExport")}</button>
            <button class="btn-sm" id="btn-ml-ds-capture" ${!_mlStatus ? "disabled" : ""}>${t("mlDsCapture")}</button>
            <button class="btn-sm" id="btn-ml-ds-refresh" ${!_mlStatus ? "disabled" : ""}>${ICONS.refresh}</button>
          </div>
        </div>
        ${_mlDatasets.length > 0 ? `
          <div style="font-size:12px;margin-top:8px">
            ${_mlDatasets.map(ds => `
              <div style="display:flex;gap:8px;padding:3px 0;font-family:monospace;align-items:center">
                <span style="flex:3">${esc(ds.name)}</span>
                <span style="flex:1;opacity:0.6">${(ds.size / 1024).toFixed(1)} KB</span>
                <span style="flex:2;opacity:0.5">${new Date(ds.modified * 1000).toLocaleString()}</span>
              </div>
            `).join("")}
          </div>` : `<div class="empty-state" style="padding:12px 0"><p style="opacity:0.4">${t("mlDsEmpty")}</p></div>`}
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">${t("mlLogs")}</span>
          <button class="btn-sm" id="btn-ml-clear-logs">${t("mlClearLogs")}</button>
        </div>
        <div class="log-box" id="ml-log-box" style="height:220px">${_mlLogs ? esc(_mlLogs) : '<span style="opacity:0.4">—</span>'}</div>
      </div>
    </div>`;
}

function bindMLSectionEvents(): void {
  // _mlToken is already initialized at app startup via get_ml_api_token() (reads system file).
  // Do NOT override it from localStorage here — localStorage may contain a stale/wrong token.
  // _mlTokenInvalid persists across re-renders; it is only reset when the token value changes.

  refreshMLState().then(() => {
    _updateMLStatusDOM();
    _updateMLLogsDOM();
  });

  if (_mlLogsInterval) clearInterval(_mlLogsInterval);
  _mlLogsInterval = setInterval(async () => {
    if (currentPage !== "home") {
      if (_mlLogsInterval) { clearInterval(_mlLogsInterval); _mlLogsInterval = null; }
      return;
    }
    try { _mlStatus = await invoke<boolean>("get_ml_status"); } catch { /**/ }
    if (!_mlStatus) {
      try { const r = await _mlFetch(`/health`, { signal: AbortSignal.timeout(1000) }); if (r.ok) _mlStatus = true; } catch { /**/ }
    }
    if (_mlStatus) {
      try {
        const r = await _mlFetch(`/logs?n=150`, { signal: AbortSignal.timeout(1500) });
        if (r.ok) { const j = await r.json() as { lines: string[] }; _mlLogs = j.lines.join("\n"); }
      } catch { try { _mlLogs = await invoke<string>("get_ml_logs"); } catch { /**/ } }
    }
    _updateMLStatusDOM();
    _updateMLLogsDOM();
  }, 3000);

  document.getElementById("btn-ml-start")?.addEventListener("click", async () => {
    try {
      await invoke("start_ml_server");
      showToast(t("mlServerStarting"), "info", 2500);
      setTimeout(async () => {
        try { _mlStatus = await invoke<boolean>("get_ml_status"); } catch { /**/ }
        _updateMLStatusDOM();
      }, 1500);
    } catch (e) { showToast(String(e), "error", 4000); }
  });

  document.getElementById("btn-ml-stop")?.addEventListener("click", async () => {
    try {
      await invoke("stop_ml_server");
      _mlStatus = false;
      _updateMLStatusDOM();
      showToast(t("mlServerStopped"), "info", 2000);
    } catch (e) { showToast(String(e), "error", 4000); }
  });

  document.getElementById("btn-ml-restart")?.addEventListener("click", async () => {
    try {
      await invoke("stop_ml_server");
      await new Promise(r => setTimeout(r, 800));
      await invoke("start_ml_server");
      showToast(t("mlServerRestarted"), "success", 2500);
      setTimeout(async () => {
        try { _mlStatus = await invoke<boolean>("get_ml_status"); } catch { /**/ }
        _updateMLStatusDOM();
      }, 1500);
    } catch (e) { showToast(String(e), "error", 4000); }
  });

  document.getElementById("btn-ml-refresh-logs")?.addEventListener("click", async () => {
    try { _mlLogs = await invoke<string>("get_ml_logs"); } catch { /**/ }
    _updateMLLogsDOM();
  });

  document.getElementById("btn-ml-clear-logs")?.addEventListener("click", async () => {
    // clear file log (Tauri) + in-memory log (Go HTTP server)
    await Promise.all([
      invoke("clear_ml_logs").catch(() => {}),
      _mlFetch("/logs/clear", { method: "POST", signal: AbortSignal.timeout(2000) }).catch(() => {}),
    ]);
    _mlLogs = "";
    const box = document.getElementById("ml-log-box");
    if (box) box.innerHTML = '<span style="opacity:0.4">—</span>';
  });

  document.getElementById("btn-ml-analyze")?.addEventListener("click", async () => {
    if (_mlAnalyzing) return;
    _mlAnalyzing = true;
    const btn = document.getElementById("btn-ml-analyze") as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = t("mlAnalyzing"); }
    try {
      const target = _mlTargetServer || getServerHost();
      const parts = target.split(":");
      const host = parts[0] || "";
      const port = parseInt(parts[1] ?? "8443", 10) || 8443;
      const rawAnalysis = await invoke<string>("ml_analyze_network", { host, port });
      _mlNetworkAnalysis = JSON.parse(rawAnalysis) as MLNetworkAnalysis;
      const rawRec = await invoke<string>("ml_recommend_transport", { serverHost: host, serverPort: port });
      _mlTransportRec = JSON.parse(rawRec) as MLTransportRecommendation;
      showToast(`${t("analysisDone")} ${_mlNetworkAnalysis.dpi_risk}`,
        _mlNetworkAnalysis.dpi_risk === "low" ? "success" : "info", 3500);
    } catch (e) {
      showToast(t("mlUnavailable"), "error", 3000);
    }
    _mlAnalyzing = false;
    const main = document.getElementById("main-content");
    if (main && currentPage === "home") { main.innerHTML = renderHome(); bindHomeEvents(); }
  });


  document.getElementById("btn-ml-train")?.addEventListener("click", async () => {
    if (!_mlStatus) return;
    if (_mlTraining) {
      try { await _mlFetch(`/train/stop`, { method: "POST", signal: AbortSignal.timeout(5000) }); } catch { /**/ }
      _mlTraining = false;
      _mlTrainStatus = t("mlTrainDone");
      const m3 = document.getElementById("main-content");
      if (m3 && currentPage === "home") { m3.innerHTML = renderHome(); bindHomeEvents(); }
      return;
    }
    _mlTraining = true;
    _mlTrainProgress = 0;
    _mlTrainEpoch = 0;
    _mlTrainLoss = 0;
    _mlTrainStatus = "";
    const m4 = document.getElementById("main-content");
    if (m4 && currentPage === "home") { m4.innerHTML = renderHome(); bindHomeEvents(); }
    try {
      const r = await _mlFetch(`/train/start`, { method: "POST", signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error("start failed");
      const pollId = setInterval(async () => {
        if (!_mlTraining || currentPage !== "home") { clearInterval(pollId); return; }
        try {
          const sr = await _mlFetch(`/train/status`, { signal: AbortSignal.timeout(3000) });
          if (sr.ok) {
            const s = await sr.json() as { running: boolean; epoch: number; total_epochs: number; loss: number };
            _mlTrainEpoch = s.epoch;
            _mlTrainLoss = s.loss;
            _mlTrainProgress = s.total_epochs > 0 ? Math.round(s.epoch / s.total_epochs * 100) : 0;
            const epochEl = document.getElementById("ml-train-epoch");
            const lossEl = document.getElementById("ml-train-loss");
            const pctEl = document.getElementById("ml-train-pct");
            const bar = document.getElementById("ml-train-bar");
            if (epochEl) epochEl.textContent = String(s.epoch);
            if (lossEl) lossEl.textContent = s.loss.toFixed(6);
            if (pctEl) pctEl.textContent = _mlTrainProgress + "%";
            if (bar) bar.style.width = _mlTrainProgress + "%";
            if (!s.running) {
              clearInterval(pollId);
              _mlTraining = false;
              _mlTrainStatus = t("mlTrainDone");
              _mlTrainProgress = 100;
              showToast(t("mlTrainDone"), "success", 3000);
              const m5 = document.getElementById("main-content");
              if (m5 && currentPage === "home") { m5.innerHTML = renderHome(); bindHomeEvents(); }
            }
          }
        } catch { /**/ }
      }, 2000);
    } catch {
      _mlTraining = false;
      _mlTrainStatus = t("mlTrainFailed");
      showToast(t("mlTrainFailed"), "error", 3000);
      const m6 = document.getElementById("main-content");
      if (m6 && currentPage === "home") { m6.innerHTML = renderHome(); bindHomeEvents(); }
    }
  });

  document.getElementById("btn-ml-fed-export")?.addEventListener("click", async () => {
    const out = document.getElementById("ml-fed-output");
    try {
      const r = await _mlFetch(`/federated/export`, { signal: AbortSignal.timeout(10000) });
      if (r.ok) { const j = await r.json(); if (out) out.textContent = JSON.stringify(j, null, 2); showToast(t("mlFedExported"), "success", 2000); }
    } catch { showToast("Error", "error", 2000); }
  });

  document.getElementById("btn-ml-fed-import")?.addEventListener("click", () => {
    const out = document.getElementById("ml-fed-output");
    const ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.innerHTML = `<div class="modal">
      <h3>Import Federated Delta</h3>
      <div class="modal-field">
        <label style="font-size:12px;opacity:0.7">Paste JSON delta from another client (output of Export Delta)</label>
        <textarea id="fed-import-json" rows="8" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:11px" placeholder='{"transports":{"tcp":{"success":10,...}}}'></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" id="fed-import-cancel">${t("cancel")}</button>
        <button class="btn-save" id="fed-import-ok">Import</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    document.getElementById("fed-import-cancel")?.addEventListener("click", () => ov.remove());
    document.getElementById("fed-import-ok")?.addEventListener("click", async () => {
      const raw = (document.getElementById("fed-import-json") as HTMLTextAreaElement)?.value.trim();
      if (!raw) { showToast("Paste JSON first", "error", 2000); return; }
      let body: string;
      try {
        const parsed = JSON.parse(raw);
        // accept both full export format {"transports":{...}} and raw transports object
        body = JSON.stringify(parsed.transports ? parsed : { transports: parsed });
      } catch { showToast("Invalid JSON", "error", 2000); return; }
      ov.remove();
      try {
        const r = await _mlFetch(`/federated/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(10000),
        });
        if (r.ok) {
          const j = await r.json();
          if (out) out.textContent = JSON.stringify(j, null, 2);
          showToast(t("mlFedImported"), "success", 2000);
        } else {
          showToast("Import failed: " + r.status, "error", 3000);
        }
      } catch (e) { showToast("Error: " + e, "error", 2000); }
    });
  });

  document.getElementById("btn-ml-fed-losses")?.addEventListener("click", async () => {
    const out = document.getElementById("ml-fed-output");
    try {
      const r = await _mlFetch(`/federated/losses`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) { const j = await r.json(); if (out) out.textContent = JSON.stringify(j, null, 2); }
    } catch { showToast("Error", "error", 2000); }
  });

  document.getElementById("btn-ml-model-reload")?.addEventListener("click", async () => {
    try {
      await _mlFetch(`/models/load`, { method: "POST", signal: AbortSignal.timeout(5000) });
      showToast(t("mlModelReloaded"), "success", 2000);
      await _refreshMLModelInfo();
    } catch { showToast("Error", "error", 2000); }
  });

  document.getElementById("btn-ml-fb-refresh")?.addEventListener("click", _refreshMLFeedback);

  document.getElementById("btn-ml-ds-export")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-ml-ds-export") as HTMLButtonElement;
    if (btn) { btn.disabled = true; btn.textContent = t("mlDsExporting"); }
    try { const result = await invoke<string>("ml_export_dataset"); showToast(result, "success", 4000); }
    catch (e) { showToast(String(e), "error", 3000); }
    if (btn) { btn.disabled = false; btn.textContent = t("mlDsExport"); }
  });

  document.getElementById("btn-ml-ds-capture")?.addEventListener("click", async () => {
    try {
      const r = await _mlFetch(`/datasets/capture`, { method: "POST", signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        showToast(t("mlDatasetCaptured"), "success", 2000);
        await _refreshMLDatasets();
        const m = document.getElementById("main-content");
        if (m && currentPage === "home") { m.innerHTML = renderHome(); bindHomeEvents(); }
      }
    } catch { showToast("Error", "error", 2000); }
  });

  document.getElementById("btn-ml-ds-refresh")?.addEventListener("click", async () => {
    await _refreshMLDatasets();
    const m = document.getElementById("main-content");
    if (m && currentPage === "home") { m.innerHTML = renderHome(); bindHomeEvents(); }
  });

  if (_mlToken && !_mlTokenInvalid) {
    _refreshMLModelInfo();
    _refreshMLFeedback();
    _refreshMLDatasets();
  }
}

function _updateMLStatusDOM(): void {
  const badge = document.getElementById("ml-status-badge");
  const modeBadge = document.getElementById("ml-mode-badge");
  if (badge) {
    badge.textContent = _mlStatus ? t("mlRunning") : t("mlStopped");
    badge.className = _mlStatus ? "badge-on" : "badge-off";
  }
  if (modeBadge) {
    modeBadge.textContent = _mlStatus ? t("mlFallbackOff") : t("mlFallbackOn");
    modeBadge.className = _mlStatus ? "badge-on" : "badge-off";
  }
  const btnStart = document.getElementById("btn-ml-start") as HTMLButtonElement | null;
  const btnStop = document.getElementById("btn-ml-stop") as HTMLButtonElement | null;
  const btnAnalyze = document.getElementById("btn-ml-analyze") as HTMLButtonElement | null;
  if (btnStart) btnStart.disabled = _mlStatus || !_mlBinaryExists;
  if (btnStop) btnStop.disabled = !_mlStatus;
  if (btnAnalyze && !_mlAnalyzing) btnAnalyze.disabled = !_mlStatus;
  const noBinaryRow = document.getElementById("ml-no-binary-row") as HTMLElement | null;
  if (noBinaryRow) noBinaryRow.style.display = (!_mlBinaryExists && !_mlStatus) ? "" : "none";
  const analysisHint = document.getElementById("ml-analysis-hint");
  if (analysisHint) analysisHint.textContent = _mlStatus ? t("mlScanFirst") : t("mlStopped") + " — " + t("mlStart");
}

function _updateMLLogsDOM(): void {
  const box = document.getElementById("ml-log-box");
  if (!box) return;
  if (_mlLogs) {
    box.textContent = _mlLogs;
    box.scrollTop = box.scrollHeight;
  } else {
    box.innerHTML = '<span style="opacity:0.4">—</span>';
  }
}


async function _refreshMLModelInfo(): Promise<void> {
  try {
    const r = await _mlFetch(`/models/status`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const j = await r.json() as { stats?: { accuracy?: number; parameters?: number; samples?: number; model?: string } };
      if (j.stats) {
        _mlModelInfo = {
          accuracy: j.stats.accuracy ?? 0,
          parameters: j.stats.parameters ?? 0,
          samples: j.stats.samples ?? 0,
          engine: j.stats.model ?? "unknown",
        };
      }
    }
  } catch { /**/ }
}

async function _refreshMLFeedback(): Promise<void> {
  try {
    const r = await _mlFetch(`/feedback/stats`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      _mlFeedbackStats = await r.json();
    }
  } catch { /**/ }
}

async function _refreshMLDatasets(): Promise<void> {
  try {
    const r = await _mlFetch(`/datasets`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const j = await r.json() as { datasets: typeof _mlDatasets };
      _mlDatasets = j.datasets || [];
    }
  } catch { /**/ }
}

function showProfileModal(): void {
  const ov = document.createElement("div");
  ov.className = "modal-overlay";
  ov.innerHTML = `<div class="modal"><h3>${t("addProfile")}</h3>
    <div class="modal-field"><label>${t("profileName")}</label><input type="text" id="modal-name"/></div>
    <div class="modal-field"><label>${t("profileKey")}</label><textarea id="modal-key" rows="3"></textarea></div>
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
    saveProfiles(); ov.remove(); renderPage();
  });
}

function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function playConnectSound(): void {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const notes = [220, 330, 440, 660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.08, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.2);
    });
  } catch { /**/ }
}

/* ===================== INIT ===================== */
window.addEventListener("DOMContentLoaded", async () => {
  loadLang(); loadProfiles();
  await loadSettings();
  _mlTargetServer = localStorage.getItem("ml_target_server") || settings.ml_server || "";
  await Promise.all([
    loadSubscriptions(),
    loadRoutingRules(),
    loadBlocklist(),
    checkStatus(),
    invoke<string>("get_ml_api_token").then(t => { _mlToken = t; }).catch(() => {}),
    invoke<boolean>("ml_binary_exists").then(v => { _mlBinaryExists = v; }).catch(() => {}),
  ]);
  if (!_mlToken) _mlToken = localStorage.getItem("ml_token") || settings.ml_token || "";
  renderShell();
  invoke<boolean>("get_ml_status").then(v => { _mlStatus = v; updateHome(); }).catch(() => {});
  checkSites(); fetchIpInfo(); fetchSysInfo();
  startSubAutoCheck();
  setInterval(() => { if (isConnected && connectTime) tickUptime(); }, 1000);

  // silent periodic status check — no re-render unless status changed
  setInterval(async () => {
    const prev = isConnected;
    await checkStatus();
    if (prev !== isConnected) updateHome();
  }, 10000);

  // Auto-export ML dataset every hour (if ML server is running).
  setInterval(async () => {
    try {
      const mlUp = await invoke<boolean>("get_ml_status");
      if (mlUp) {
        const result = await invoke<string>("ml_export_dataset");
        console.log("[ML Auto-Export]", result);
      }
    } catch { /**/ }
  }, 60 * 60 * 1000);
});
