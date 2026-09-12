// Gran Reserva Residence — configuration and static data (house types from drawing 25:04/A-01A, Richard Gill Associates)

export const SQFT_PER_M2 = 10.7639;

// House types as tabulated on the Parcel A Extract Plan (gross floor / roof areas per house, sq ft)
// phases (parcels) open to the public without the password; the others show "under construction" until unlocked.
// null = every phase open (no password gate)
export const OPEN_PARCELS = null;

// stable id prefix of the units (unit_id = PREFIX + 32 hex); the backend accepts 2-4 capital letters + underscore
export const PID_PREFIX = 'GRR_';
// project typology: lots | houses | building | house (references/03 of the skill); building = floors + apartments read from data/site.json
export const TYPOLOGY = 'building';
// vertical projects: how the floors above the selected one are shown: 'ghost' (transparent), 'hide' or 'explode' (lifted by explodeGap m each)
export const BUILDING = { reveal: 'ghost', explodeGap: 2.5 };

export const TYPES = {
  // 5º ao 12º pavimento: 4 apartamentos por andar, finais 01-04 (áreas privativas 73,11 / 73,59 / 77,94 / 82,61 m² no marcador de cada unidade)
  1: { key: 'tipo', beds: 2, baths: 2, lavabo: true, gfaSqft: null, roofSqft: null, units: 1, hex: '#3e9bff', label: { en: 'Standard floor · 2 suites', pt: 'Pavimento tipo · 2 suítes' },
       images: ["apt_06.jpg", "apt_07.jpg", "apt_08.jpg", "apt_09.jpg", "apt_10.jpg", "apt_11.jpg", "apt_05.jpg"], plan: 'planta_tipo.jpg', planLabel: { en: 'Typical floor plan · 5th to 12th', pt: 'Planta tipo · 5º ao 12º' }, panos: ['apartamento_living', 'apartamento_suite'] },
  // 4º pavimento (tipo diferenciado): terraços privativos (72,85 / 105,39 / 129,88 / 98,59 m²)
  2: { key: 'diferenciado', beds: 2, baths: 2, lavabo: true, gfaSqft: null, roofSqft: null, units: 1, hex: '#e8962a', label: { en: 'Garden floor · 2 suites + terrace', pt: 'Tipo diferenciado · 2 suítes + terraço' },
       images: ["apt_01.jpg", "apt_02.jpg", "apt_03.jpg", "apt_04.jpg", "apt_06.jpg", "apt_07.jpg", "apt_08.jpg", "apt_09.jpg", "apt_10.jpg", "apt_11.jpg"], plan: 'planta_diferenciado.jpg', planLabel: { en: 'Differentiated floor plan · 4th', pt: 'Planta do tipo diferenciado · 4º' }, panos: ['apartamento_living', 'apartamento_suite', 'ap_terraco', 'ap_terraco_gourmet', 'apartamento_terraco_pergolado'] },
};

// Colour pattern used in the PDF ("padrao_pdf" custom property in Blender) -> house type
export const PDF_TYPE = { azul: 3, verde: 1, lilas: 2, ouro: 4 };

// Blender model index -> building kind (models 1-3 share the single-house body, 4-6 the duplex body)
export const MODEL_KIND = { 1: 'single', 2: 'single', 3: 'single', 4: 'duplex', 5: 'duplex', 6: 'duplex' };

// Facade colour names (Blender materials) -> display names
export const COLOR_LABEL = {
  'Oak Tone': 'Oak Tone',
  'Caramel cloud': 'Caramel Cloud',
  'isle dreamns': 'Isle Dreams',
  'in the blue': 'In the Blue',
  'Marzipan': 'Marzipan',
  'Pinkathon': 'Pinkathon',
};

// Reference renders (assets/img/house_N.jpg). Each render shows one body kind in one facade colour.
export const IMAGES = {
  single: { 'Caramel cloud': 1, 'Oak Tone': 3, 'Marzipan': 4 },
  duplex: { 'isle dreamns': 2, 'in the blue': 5, 'Pinkathon': 6 },
};
export const IMAGE_COLOR = { 1: 'Caramel cloud', 2: 'isle dreamns', 3: 'Oak Tone', 4: 'Marzipan', 5: 'in the blue', 6: 'Pinkathon' };
export const IMAGE_FALLBACK = { single: 3, duplex: 5 };
export const IMAGE_KIND = { 1: 'single', 2: 'duplex', 3: 'single', 4: 'single', 5: 'duplex', 6: 'duplex' };

// leisure areas (assets/img/leisure_N.jpg), opened by the Leisure button
export const LEISURE = [
  { file: 'leisure_1.jpg', label: { en: 'Pool', pt: 'Piscina' } },
  { file: 'leisure_2.jpg', label: { en: 'Pool kiosk', pt: 'Quiosque da piscina' } },
  { file: 'leisure_3.jpg', label: { en: 'Pool', pt: 'Piscina' } },
  { file: 'leisure_4.jpg', label: { en: 'Party room', pt: 'Salão de festas' } },
  { file: 'leisure_5.jpg', label: { en: 'Lounge', pt: 'Espaço estar' } },
  { file: 'leisure_6.jpg', label: { en: 'Gym', pt: 'Academia' } },
  { file: 'leisure_7.jpg', label: { en: 'Kids room', pt: 'Brinquedoteca' } },
  { file: 'leisure_8.jpg', label: { en: 'Game room', pt: 'Sala de jogos' } },
  { file: 'leisure_9.jpg', label: { en: 'Pet place', pt: 'Pet place' } },
  { file: 'leisure_10.jpg', label: { en: 'Playground', pt: 'Playground' } },
];

export function imageFor(kind, color) {
  const exact = IMAGES[kind]?.[color];
  return { index: exact ?? IMAGE_FALLBACK[kind], exact: exact !== undefined };
}

// Commercial backend (Google Apps Script web app, see tools/backend/README.md). Leave empty to run in read-only mode:
// statuses come from data/status.json and the sales actions fall back to e-mail links.
export const BACKEND = {
  url: 'https://script.google.com/macros/s/AKfycbwLp0LH6krv-cbGEUkekxaCCqY2TbcII6E_cC-kDgqkvWyaykaeY664q7qxCP3c8mkG5Q/exec', tools/backend (README): empty = read-only statuses from data/status.json
  salesEmail: "comercial@jncempreendimentos.com.br",             // recipient of the "I'm interested" leads (also used by the mailto fallback)
  pollSeconds: 45,                           // how often visitors refresh the property statuses
};

// Opening view (three.js coordinates: x east, y up, z south), captured from the viewer on 2026-09-10
export const OVERVIEW = { pos: [-70, 42, 88], target: [2, 16, -14] };   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // captured in the viewer (window.__app.capture())   // null = automatic framing of the site bounds; capture the real one in the viewer later

export const PARCELS = ['T1'];   // towers (one chip per tower when there are several)
// Blender lot numbers ("Terrenos NNN") that are parks: not selectable, no tooltip, filled with trees (besides the
// open-space lots flagged hidden in the export)
export const PARK_LOTS = [];   // Blender lot numbers that are parks (not selectable, filled with trees)
export const STATUS = {
  available: { hex: '#34a853', label: { en: 'Available', pt: 'Disponível' } },
  reserved: { hex: '#f0a020', label: { en: 'Reserved', pt: 'Reservada' } },
  sold: { hex: '#d93025', label: { en: 'Sold', pt: 'Vendida' } },
};

export const I18N = {
  en: {
    subtitle: 'São Francisco de Assis · Camboriú · SC',
    loading: 'Loading the subdivision…',
    houses: 'homes',
    lots: 'lots',
    resetView: 'Overview',
    topView: 'Top view',
    colorByType: 'Colour by type',
    ao: 'AO',
    legend: 'House types',
    search: 'Search house or lot…',
    noResults: 'No match',
    hoverHint: 'Hover a house for a quick summary · click to open details',
    controls: 'Drag to orbit · right-drag / two fingers to pan · scroll to zoom',
    lot: 'Lot',
    house: 'House',
    type: 'Type',
    beds: 'bed',
    baths: 'bath',
    perUnit: 'per unit',
    units: 'units',
    gfa: 'Gross floor area',
    roof: 'Gross roof area',
    lotArea: 'Lot area',
    facade: 'Facade colour',
    model: '3D model',
    openSpace: 'Open space',
    freeLot: 'Lot without a house in the current layout',
    imgNote: 'Reference render shown in',
    imgExact: 'Reference render of this house',
    flyTo: 'Fly to house',
    close: 'Close',
    prev: 'Previous',
    next: 'Next',
    sqft: 'sq ft',
    sqm: 'sq m',
    all: 'All',
    onlyType: 'Only this type',
    showAll: 'Show all types',
    source: 'Areas per drawings 25:04/02D and 25:04/A-01A (Richard Gill Associates Ltd.). Lot areas measured on the 3D model.',
    parcels: 'Phases',
    parcelsHint: 'Show or hide the houses of each phase',
    leisure: 'Leisure', leisureTitle: 'Leisure areas', chooseColour: 'choose the facade colour · the 3D house updates', similarHouse: 'similar house', singleHouse: 'Single house', duplexHouse: 'Duplex', galleryHint: 'Click to enlarge · arrows for the other colours', colourWord: 'Facade colour',
    floors: 'Floors', floor: 'Floor', allFloors: 'All floors', towers: 'Towers', tower: 'Tower', privateArea: 'Private area', totalArea: 'Total area', unitsWord: 'units', apartmentType: 'Apartment type',
    phase: 'Phase', underConstruction: 'under construction', unlockIntro: 'This phase is not released yet. Enter the access password to preview it.', unlock: 'Unlock', checking: 'Checking…', unlocked: 'Phase {p} unlocked.', legendMenu: 'Legend', lockedHint: 'Under construction · click to enter the password',
    propertyId: 'Property ID',
    status: 'Status',
    houseModel: 'House model',
    parcel: 'Parcel',
    floorPlan: 'Floor plan',
    enlarge: 'Enlarge',
    interested: "I'm interested",
    reserve: 'Reserve',
    markSold: 'Mark as sold',
    night: 'Night',
    day: 'Day',
    map: 'Region',
    mapTitle: 'Around Gran Reserva Residence',
    mapHint: 'Road distances and driving times from the site are estimates (OpenStreetMap data, OSRM routing). Click a place to draw its route along the streets; drag to pan, scroll to zoom.',
    leadTitle: 'Tell us you are interested',
    leadIntro: 'The sales team receives your message together with the property reference.',
    name: 'Name',
    email: 'E-mail',
    phone: 'Phone',
    message: 'Message',
    send: 'Send',
    cancel: 'Cancel',
    sending: 'Sending…',
    leadSent: 'Thank you. Your interest was sent to the sales team.',
    leadFailed: 'The message could not be sent. Please try again or e-mail',
    authTitle: 'Authorised staff only',
    authIntro: 'Enter the sales password to change the status of this property (reserve, sold, release).',
    password: 'Password',
    confirm: 'Confirm',
    reserveOk: 'Property reserved.',
    soldOk: 'Property marked as sold.',
    wrongPassword: 'Wrong password.',
    notAvailable: 'This property is no longer available.',
    networkError: 'Could not reach the sales server. Check your connection and try again.',
    readOnly: 'The sales server is not configured yet: statuses are read-only on this page.',
    statusLegend: 'Status',
    inferred: 'parcel inferred from neighbouring lots',
    closeMap: 'Close',
    distance: 'Distance',
    drive: 'Drive',
    min: 'min',
    lastUpdate: 'Status updated',
    release: 'Release (undo)',
    cancelReservation: 'Cancel reservation',
    releaseOk: 'The property is available again.',
    authIntroAdmin: 'Enter the administrator password to change the status of this property.',
    throttled: 'Too many failed attempts. Please wait 10 minutes and try again.',
    busy: 'The sales server is busy, please try again.',
    loadingMap: 'Loading the map…',
    byPhase: 'By phase',
    twin: 'Semi-detached with',
    unit: 'unit', unitTitle: 'Unit',
    statusHint: 'Show or hide the houses with this status (shift-click: only this one)',
    lighting: 'Lighting',
    dusk: 'Dusk',
    clickForRoute: 'Click to see the route by road',
    showRoute: 'Frame the route',
    byRoad: 'by road',
    straightLine: 'straight line',
  },
  pt: {
    subtitle: 'São Francisco de Assis · Camboriú · SC',
    loading: 'Carregando o loteamento…',
    houses: 'imóveis',
    lots: 'lotes',
    resetView: 'Visão geral',
    topView: 'Vista de topo',
    colorByType: 'Cor por tipo',
    ao: 'AO',
    legend: 'Tipos de casa',
    search: 'Buscar casa ou lote…',
    noResults: 'Nada encontrado',
    hoverHint: 'Passe o mouse sobre uma casa para o resumo · clique para abrir os detalhes',
    controls: 'Arraste para orbitar · botão direito / dois dedos para mover · scroll para zoom',
    lot: 'Lote',
    house: 'Casa',
    type: 'Tipo',
    beds: 'quarto(s)',
    baths: 'banho(s)',
    perUnit: 'por unidade',
    units: 'unidades',
    gfa: 'Área construída bruta',
    roof: 'Área bruta de telhado',
    lotArea: 'Área do lote',
    facade: 'Cor da fachada',
    model: 'Modelo 3D',
    openSpace: 'Área verde',
    freeLot: 'Lote sem casa no layout atual',
    imgNote: 'Render de referência na cor',
    imgExact: 'Render de referência desta casa',
    flyTo: 'Ir até a casa',
    close: 'Fechar',
    prev: 'Anterior',
    next: 'Próxima',
    sqft: 'sq ft',
    sqm: 'm²',
    all: 'Todos',
    onlyType: 'Somente este tipo',
    showAll: 'Mostrar todos os tipos',
    source: 'Áreas conforme desenhos 25:04/02D e 25:04/A-01A (Richard Gill Associates Ltd.). Áreas de lote medidas no modelo 3D.',
    parcels: 'Fases',
    parcelsHint: 'Mostre ou oculte as casas de cada fase',
    leisure: 'Lazer', leisureTitle: 'Áreas de lazer', chooseColour: 'escolha a cor da fachada · a casa 3D atualiza', similarHouse: 'casa semelhante', singleHouse: 'Casa isolada', duplexHouse: 'Geminada', galleryHint: 'Clique para ampliar · setas para as outras cores', colourWord: 'Cor da fachada',
    floors: 'Pavimentos', floor: 'Pavimento', allFloors: 'Todos', towers: 'Torres', tower: 'Torre', privateArea: 'Área privativa', totalArea: 'Área total', unitsWord: 'unidades', apartmentType: 'Tipo de apartamento',
    phase: 'Fase', underConstruction: 'em construção', unlockIntro: 'Esta fase ainda não foi liberada. Digite a senha de acesso para vê-la.', unlock: 'Liberar', checking: 'Verificando…', unlocked: 'Fase {p} liberada.', legendMenu: 'Legenda', lockedHint: 'Em construção · clique para digitar a senha',
    propertyId: 'ID do imóvel',
    status: 'Situação',
    houseModel: 'Modelo da casa',
    parcel: 'Parcela',
    floorPlan: 'Planta baixa',
    enlarge: 'Ampliar',
    interested: 'Tenho interesse',
    reserve: 'Reservar',
    markSold: 'Marcar como vendida',
    night: 'Noite',
    day: 'Dia',
    map: 'Região',
    mapTitle: 'Ao redor do Gran Reserva Residence',
    mapHint: 'Distâncias por estrada e tempos de carro a partir do empreendimento são estimativas (dados OpenStreetMap, roteamento OSRM). Clique em um lugar para desenhar o trajeto pelas ruas; arraste para mover, role para ampliar.',
    leadTitle: 'Registrar interesse',
    leadIntro: 'A equipe de vendas recebe sua mensagem junto com a referência do imóvel.',
    name: 'Nome',
    email: 'E-mail',
    phone: 'Telefone',
    message: 'Mensagem',
    send: 'Enviar',
    cancel: 'Cancelar',
    sending: 'Enviando…',
    leadSent: 'Obrigado. Seu interesse foi enviado à equipe de vendas.',
    leadFailed: 'Não foi possível enviar. Tente novamente ou escreva para',
    authTitle: 'Somente equipe autorizada',
    authIntro: 'Digite a senha de vendas para alterar a situação deste imóvel (reservar, vender, liberar).',
    password: 'Senha',
    confirm: 'Confirmar',
    reserveOk: 'Imóvel reservado.',
    soldOk: 'Imóvel marcado como vendido.',
    wrongPassword: 'Senha incorreta.',
    notAvailable: 'Este imóvel não está mais disponível.',
    networkError: 'Não foi possível falar com o servidor de vendas. Verifique a conexão e tente de novo.',
    readOnly: 'O servidor de vendas ainda não está configurado: as situações são somente leitura nesta página.',
    statusLegend: 'Situação',
    inferred: 'parcela inferida pelos lotes vizinhos',
    closeMap: 'Fechar',
    distance: 'Distância',
    drive: 'De carro',
    min: 'min',
    lastUpdate: 'Situação atualizada',
    release: 'Liberar (desfazer)',
    cancelReservation: 'Cancelar reserva',
    releaseOk: 'O imóvel está disponível novamente.',
    authIntroAdmin: 'Digite a senha de administrador para alterar a situação deste imóvel.',
    throttled: 'Muitas tentativas sem sucesso. Aguarde 10 minutos e tente de novo.',
    busy: 'O servidor de vendas está ocupado, tente novamente.',
    loadingMap: 'Carregando o mapa…',
    byPhase: 'Por fase',
    twin: 'Geminada com',
    unit: 'unidade', unitTitle: 'Unidade',
    statusHint: 'Mostre ou oculte as casas com esta situação (shift+clique: somente esta)',
    lighting: 'Iluminação',
    dusk: 'Entardecer',
    clickForRoute: 'Clique para ver o trajeto pelas ruas',
    showRoute: 'Enquadrar o trajeto',
    byRoad: 'pela estrada',
    straightLine: 'em linha reta',
  },
};

export const PROJECT_NAME = "Gran Reserva Residence";

// ===== GRANRESERVA-BEGIN (tools/patch_config_granreserva.py) =====
// 360° panoramas (assets/pano, full 6000x3000 + 2k first load + thumbs), by group: apartment panel / leisure menu
export const PANOS = [
  { id: 'academia', group: 'leisure', label: {"pt": "Academia", "en": "Gym"}, file: 'assets/pano/academia.jpg', low: 'assets/pano/academia_2k.jpg', thumb: 'assets/pano/academia_thumb.jpg' },
  { id: 'ap_terraco_gourmet', group: 'apartment', label: {"pt": "Terraço gourmet", "en": "Gourmet terrace"}, file: 'assets/pano/ap_terraco_gourmet.jpg', low: 'assets/pano/ap_terraco_gourmet_2k.jpg', thumb: 'assets/pano/ap_terraco_gourmet_thumb.jpg' },
  { id: 'ap_terraco', group: 'apartment', label: {"pt": "Terraço", "en": "Terrace"}, file: 'assets/pano/ap_terraco.jpg', low: 'assets/pano/ap_terraco_2k.jpg', thumb: 'assets/pano/ap_terraco_thumb.jpg' },
  { id: 'apartamento_terraco_pergolado', group: 'apartment', label: {"pt": "Terraço com pergolado", "en": "Pergola terrace"}, file: 'assets/pano/apartamento_terraco_pergolado.jpg', low: 'assets/pano/apartamento_terraco_pergolado_2k.jpg', thumb: 'assets/pano/apartamento_terraco_pergolado_thumb.jpg' },
  { id: 'apartamento_living', group: 'apartment', label: {"pt": "Living", "en": "Living room"}, file: 'assets/pano/apartamento_living.jpg', low: 'assets/pano/apartamento_living_2k.jpg', thumb: 'assets/pano/apartamento_living_thumb.jpg' },
  { id: 'apartamento_suite', group: 'apartment', label: {"pt": "Suíte", "en": "Master suite"}, file: 'assets/pano/apartamento_suite.jpg', low: 'assets/pano/apartamento_suite_2k.jpg', thumb: 'assets/pano/apartamento_suite_thumb.jpg' },
  { id: 'festas', group: 'leisure', label: {"pt": "Salão de festas", "en": "Party room"}, file: 'assets/pano/festas.jpg', low: 'assets/pano/festas_2k.jpg', thumb: 'assets/pano/festas_thumb.jpg' },
  { id: 'game_center', group: 'leisure', label: {"pt": "Game center", "en": "Game center"}, file: 'assets/pano/game_center.jpg', low: 'assets/pano/game_center_2k.jpg', thumb: 'assets/pano/game_center_thumb.jpg' },
  { id: 'gourmet_fundos', group: 'leisure', label: {"pt": "Espaço gourmet", "en": "Gourmet space"}, file: 'assets/pano/gourmet_fundos.jpg', low: 'assets/pano/gourmet_fundos_2k.jpg', thumb: 'assets/pano/gourmet_fundos_thumb.jpg' },
  { id: 'lazer_fundos', group: 'leisure', label: {"pt": "Lazer dos fundos", "en": "Back leisure deck"}, file: 'assets/pano/lazer_fundos.jpg', low: 'assets/pano/lazer_fundos_2k.jpg', thumb: 'assets/pano/lazer_fundos_thumb.jpg' },
  { id: 'lounge_rooftop', group: 'leisure', label: {"pt": "Lounge do rooftop", "en": "Rooftop lounge"}, file: 'assets/pano/lounge_rooftop.jpg', low: 'assets/pano/lounge_rooftop_2k.jpg', thumb: 'assets/pano/lounge_rooftop_thumb.jpg' },
  { id: 'piscina_kids', group: 'leisure', label: {"pt": "Piscina infantil", "en": "Kids pool"}, file: 'assets/pano/piscina_kids.jpg', low: 'assets/pano/piscina_kids_2k.jpg', thumb: 'assets/pano/piscina_kids_thumb.jpg' },
  { id: 'piscina_prainha', group: 'leisure', label: {"pt": "Piscina com prainha", "en": "Beach-entry pool"}, file: 'assets/pano/piscina_prainha.jpg', low: 'assets/pano/piscina_prainha_2k.jpg', thumb: 'assets/pano/piscina_prainha_thumb.jpg' }
];
// hotspots between panoramas: yaw / pitch in the player's own degrees (open ?panoedit=1 and click to read them)
export const PANO_LINKS = {
  // apartment (checked in the viewer on 2026-09-11: living lon 0 = entrance doors, 180 = dining window; suite 38 = door; terraces: glass doors)
  apartamento_living: [{ to: 'apartamento_suite', yaw: 8, pitch: -3 }, { to: 'ap_terraco', yaw: 178, pitch: -3 }],
  apartamento_suite: [{ to: 'apartamento_living', yaw: 38, pitch: -4 }],
  ap_terraco: [{ to: 'apartamento_living', yaw: 246, pitch: -4 }, { to: 'ap_terraco_gourmet', yaw: 130, pitch: -3 }],
  ap_terraco_gourmet: [{ to: 'apartamento_living', yaw: 236, pitch: -4 }, { to: 'apartamento_terraco_pergolado', yaw: 27, pitch: -2 }],
  apartamento_terraco_pergolado: [{ to: 'ap_terraco_gourmet', yaw: 100, pitch: -3 }, { to: 'apartamento_living', yaw: 208, pitch: -4 }],
  // leisure (first guesses: refine with ?panoedit=1 - click on the door / passage and paste the yaw / pitch here)
  piscina_prainha: [{ to: 'piscina_kids', yaw: 70, pitch: -8 }, { to: 'lounge_rooftop', yaw: -100, pitch: -3 }],
  piscina_kids: [{ to: 'piscina_prainha', yaw: -110, pitch: -8 }],
  lounge_rooftop: [{ to: 'piscina_prainha', yaw: 80, pitch: -6 }],
  festas: [{ to: 'game_center', yaw: 90, pitch: -3 }, { to: 'gourmet_fundos', yaw: -60, pitch: -3 }],
  game_center: [{ to: 'festas', yaw: -90, pitch: -3 }, { to: 'academia', yaw: 40, pitch: -3 }],
  academia: [{ to: 'game_center', yaw: -140, pitch: -3 }],
  gourmet_fundos: [{ to: 'lazer_fundos', yaw: 60, pitch: -5 }, { to: 'festas', yaw: 120, pitch: -3 }],
  lazer_fundos: [{ to: 'gourmet_fundos', yaw: -120, pitch: -5 }],
};
// opening direction of each panorama (player degrees); unset = 0 (the centre of the equirectangular image)
export const PANO_START = { ap_terraco: 240, ap_terraco_gourmet: 0, apartamento_terraco_pergolado: 0, apartamento_living: 180, apartamento_suite: 240 };
// 360 badges over the building (Blender metres: x east along the street, y towards the back, z up) -> leisure panoramas
export const PANO_MARKERS = [
  { pano: 'piscina_prainha', pos: [-4.5, 16.0, 41.2] },
  { pano: 'lounge_rooftop', pos: [5.5, 13.0, 41.2] },
  { pano: 'academia', pos: [-4.0, 22.0, 8.4] },
  { pano: 'festas', pos: [-2.0, 10.0, 8.4] },
  { pano: 'game_center', pos: [4.5, 17.0, 8.4] },
  { pano: 'gourmet_fundos', pos: [2.0, 26.5, 8.4] },
  { pano: 'lazer_fundos', pos: [9.0, 27.0, 8.4] },
];
// Google Photorealistic 3D Tiles (src/tiles3d.js): key from Google Maps Platform with the Map Tiles API enabled and the
// HTTP referrers restricted to the site domains (+ localhost for tests). Empty key = fallback context only.
// lot = footprint of the site in model metres: the photogrammetry is clipped inside it (the hillside lot climbs ~5 m from
// the street; the lower floors are dug in) and a retaining-wall skirt is built on its boundary; the tiles are levelled on
// the sidewalk line in front of the lot (three probes 1 m outside the lot front + the kerb line)
export const GOOGLE_TILES = { key: 'AIzaSyAuDCrJLL2HnWJJdblHvHFyllce24Iym2U', groundHeight: null, autoLevel: true, errorTarget: null,
  lot: { x: [-10.4, 13.6], y: [3.6, 28.6] }, lotMargin: 0.35, clipLot: true, skirt: true, skirtBottom: -8,
  look: { gain: 1.45, saturation: 1.6, gamma: 0.88 }, nightTintMin: 0.42,
  tilesOnly: true, loadTimeoutMs: 30000 };   // tilesOnly: the old map (satellite + DEM) is never loaded unless the tiles fail; the loading screen waits for the tiles   // look: the photogrammetry lifted / saturated to sit with the building (user review); Maps Platform API Key (projeto GRAN RESERVA 3D), restrita aos referrers localhost:5174 / unkviewer.com / github.io e as APIs Maps
// camera: the orbit distance is capped (the surroundings are the neighbourhood, not the region - the regional map
// covers the far places), the target stays on the building (no panning, zoom towards the target) and after a few
// seconds without input the camera orbits slowly around it
export const CAMERA = { maxDistance: 800, lockTarget: true, orbit: { enabled: true, idleMs: 6000, speed: 0.45 } };
// points of interest closer than edgeKm are pinned to the screen border when they fall out of the view
export const POI = { edgeKm: 9, nearHide: 260 };   // nearHide: no dots when the camera is closer than 260 m to the building   // every place of the neighbourhood and the city is pinned (one dot per direction)
// legend: no floor chips and no per-phase status table (user review 2026-09-12; the floors are reached from the apartment panel and the tour)
export const LEGEND = { floors: false, byPhase: false };
// humanised plan of each final (assets/plans/unit_<type>_<final>.jpg, tools/prepare_unit_plans.py from the developer's
// "ap TIPO final 0N" / "ap DIferenciado terraço final 0N" images, 2026-09-12); the 4th-floor final 01 keeps the floor plan
export const UNIT_PLANS = {"tipo": {"01": "unit_tipo_01.jpg", "02": "unit_tipo_02.jpg", "03": "unit_tipo_03.jpg", "04": "unit_tipo_04.jpg"}, "diferenciado": {"02": "unit_diferenciado_02.jpg", "03": "unit_diferenciado_03.jpg", "04": "unit_diferenciado_04.jpg"}};
// balcony glass (user review 2026-09-12: less blue, more transparent and reflective)
export const GLASS = { color: 0xe4ebee, opacity: 0.26, roughness: 0.03, metalness: 0.4, envMapIntensity: 2.4, specularIntensity: 1.0 };
// night lighting of the building and its street (three.js frame: x east, y up, z = -model y). Street lamps stand on the
// sidewalk in front of the lot (their light pools mark the Google ground, which is unlit); the facade gets three
// uplights from the podium roof; warm points in the hall, the leisure floor and the rooftop lounge; the pool glows;
// the glass of the hall (floor 0) and of the leisure floor (floor 2) is lit like the apartments (publicPanes)
export const NIGHT_LIGHTS = {
  lamps: [{ x: -34, y: 1.8, nx: 0, ny: -1 }, { x: -18, y: 1.8, nx: 0, ny: -1 }, { x: -2, y: 1.8, nx: 0, ny: -1 }, { x: 14, y: 1.8, nx: 0, ny: -1 }, { x: 30, y: 1.8, nx: 0, ny: -1 }],
  spots: [
    { pos: [-4.0, 10.7, -5.6], target: [-4.0, 36, -7.5], color: 0xffe4bd, intensity: 900, angle: 0.30, penumbra: 0.75, distance: 70 },
    { pos: [8.0, 10.7, -5.6], target: [8.0, 36, -7.5], color: 0xffe4bd, intensity: 900, angle: 0.30, penumbra: 0.75, distance: 70 },
    { pos: [1.6, 6.2, -1.5], target: [1.6, 0, -6.5], color: 0xffd9a5, intensity: 320, angle: 0.55, penumbra: 0.6, distance: 30 },
  ],
  points: [
    { pos: [1.6, 2.6, -5.0], color: 0xffd9a5, intensity: 60, distance: 20 },
    { pos: [4.5, 8.6, -12.0], color: 0xffd9a5, intensity: 45, distance: 18 },
    { pos: [5.0, 8.6, -20.5], color: 0xffd9a5, intensity: 45, distance: 18 },
    { pos: [5.5, 41.6, -16.0], color: 0xffd9a5, intensity: 70, distance: 26 },
    { pos: [-4.5, 41.2, -16.5], color: 0x8fdcff, intensity: 30, distance: 16 },
  ],
  pool: { color: 0x3fc0e6, intensity: 0.9 },
  publicPanes: { floors: [{ floor: 0, y: [-0.2, 3.3] }, { floor: 2, y: [6.5, 10.3] }], color: 0xffe0b0, opacity: 0.95 },
};
// sky / sun rotation about the vertical axis (degrees): the Poly Haven HDRI has its sun in the SE (lighting the street
// facade); turned by 68.6 deg it stands in the NE, as the real sun does at 27 S, and the shadows fall to the SW like the
// baked shadows of the Google imagery (user review 2026-09-11)
export const SUN_ROTATION_DEG = 68.6;
// leisure plan (3rd floor) and rooftop plan for the leisure menu
export const LEISURE_PLANS = [
  { file: 'planta_lazer.jpg', label: { en: 'Leisure floor · 3rd', pt: 'Lazer · 3º pavimento' } },
  { file: 'planta_rooftop.jpg', label: { en: 'Rooftop', pt: 'Rooftop' } },
];
// cinematic opening: the camera starts far above the site and flies to OVERVIEW while the logo fades (click / key skips)
export const INTRO = { enabled: true, ms: 7000, logoMs: 2600, distance: 3.4, height: 190 };
// guided tour (button "Tour"): camera pose (three.js x east, y up, z south), optional floor filter, unit, time of day (0 day .. 1 night)
export const TOUR = [
  { id: 'fachada', pos: [-48, 26, 62], target: [2, 20, -10], title: { pt: 'Fachada', en: 'Facade' }, text: { pt: 'Torre de 13 pavimentos com 36 apartamentos. Brises de madeira, sacadas curvas com guarda-corpo de vidro e o rooftop coroando o edifício.', en: '13-storey tower with 36 apartments. Wooden brises, curved balconies with glass railings and the rooftop crowning the building.' } },
  { id: 'lazer', floor: 2, pos: [36, 22, 34], target: [2, 8, -16], title: { pt: 'Lazer · 3º pavimento', en: 'Leisure · 3rd floor' }, text: { pt: 'Salão de festas, espaço gourmet, academia, game center, brinquedoteca, pet place e playground. Toque nos badges 360° para entrar nos ambientes.', en: 'Party room, gourmet space, gym, game center, kids room, pet place and playground. Tap the 360° badges to step inside.' } },
  { id: 'terracos', floor: 3, pos: [-46, 18, 22], target: [-4, 12, -16], title: { pt: 'Terraços · 4º pavimento', en: 'Terraces · 4th floor' }, text: { pt: 'Quatro apartamentos diferenciados com terraços privativos de até 130 m² de área privativa, com pérgola e espaço gourmet ao ar livre.', en: 'Four differentiated apartments with private terraces, up to 130 m² of private area, pergola and outdoor gourmet corner.' } },
  { id: 'tipo', floor: 7, unit: '803', pos: [-40, 34, 30], target: [2, 27, -16], title: { pt: 'Pavimento tipo', en: 'Typical floor' }, text: { pt: 'Quatro apartamentos por andar, do 5º ao 12º: 2 suítes, lavabo, living integrado e sacada. Áreas privativas de 73 a 83 m². Abra o Tour 360° no painel.', en: 'Four apartments per floor, 5th to 12th: 2 suites, guest toilet, open-plan living and balcony. 73 to 83 m² of private area. Open the 360° tour in the panel.' } },
  { id: 'rooftop', floor: null, pos: [26, 60, 26], target: [1, 42, -16], title: { pt: 'Rooftop', en: 'Rooftop' }, text: { pt: 'Piscina com prainha, piscina infantil e lounge com vista para o mar e para a mata.', en: 'Beach-entry pool, kids pool and a lounge overlooking the sea and the forest.' } },
  { id: 'entardecer', time: 0.64, pos: [-70, 42, 88], target: [2, 16, -14], title: { pt: 'Entardecer', en: 'Dusk' }, text: { pt: 'Ao entardecer os apartamentos se acendem. Use o controle de iluminação na legenda para escolher a hora do dia.', en: 'At dusk the apartments light up. Use the lighting slider in the legend to pick the time of day.' } },
];
export const DEVELOPER = { name: 'JNC Empreendimentos', logo: 'assets/jnc.png', url: 'https://www.jncempreendimentos.com.br/', email: 'comercial@jncempreendimentos.com.br', whatsapp: '' };
export const APARTMENT_FLOORS = { 3: '4º', 4: '5º', 5: '6º', 6: '7º', 7: '8º', 8: '9º', 9: '10º', 10: '11º', 11: '12º' };   // FLOOR_NN -> storey name
export const FLOOR_LABELS = { 0: { pt: 'Térreo', en: 'Ground' }, 1: { pt: 'Garagem', en: 'Parking' }, 2: { pt: 'Lazer', en: 'Leisure' }, 3: { pt: '4º · terraços', en: '4th · terraces' }, 12: { pt: 'Rooftop', en: 'Rooftop' } };
Object.assign(I18N.en, {
  loading: 'Loading the building…', houses: 'apartments', lots: 'floors', legend: 'Apartment types', search: 'Search an apartment (e.g. 803)…',
  hoverHint: 'Hover an apartment for a quick summary · click to open it', unitTitle: 'Apartment', unit: 'apartment', flyTo: 'View the apartment',
  interested: "I'm interested", floor: 'Floor', privateArea: 'Private area', layout: 'Layout', suites: 'suites', baths: 'bathrooms', lavabo: 'guest toilet', parking: '1 parking space',
  tour360: '360° tour', tour360Hint: 'Look around the apartment · works with the gyroscope on your phone', leisure360: 'Leisure in 360°', leisureRenders: 'Leisure areas', leisurePlans: 'Leisure plans',
  panoGyro: 'Gyro', panoGyroHint: 'Move the phone to look around', panoGyroDenied: 'Gyroscope permission denied', panoGyroNone: 'No gyroscope on this device', panoTapGyro: 'Tap “Gyro” to look around by moving the phone',
  panoAuto: 'Auto', panoAutoHint: 'Rotate slowly when idle', panoFull: 'Full screen', panoFullHint: 'Full screen', panoNoFull: 'Full screen is not available here', panoVrHint: 'Put the phone in a Cardboard viewer · tap VR again to leave',
  panoLoadError: 'Could not load this panorama', plan: 'Plan', final: 'unit',  open360: 'Open in 360°', realization: 'Developer', poweredBy: 'Powered by', markers360: '360° spots',
  tour: 'Tour', tourEnd: 'Finish', skip: 'Skip intro',
});
Object.assign(I18N.pt, {
  loading: 'Carregando o empreendimento…', houses: 'apartamentos', lots: 'pavimentos', legend: 'Tipos de apartamento', search: 'Buscar apartamento (ex.: 803)…',
  hoverHint: 'Passe o mouse sobre um apartamento · clique para abrir', unitTitle: 'Apartamento', unit: 'apartamento', flyTo: 'Ver o apartamento',
  interested: 'Tenho interesse', floor: 'Pavimento', privateArea: 'Área privativa', layout: 'Programa', suites: 'suítes', baths: 'banheiros', lavabo: 'lavabo', parking: '1 vaga',
  tour360: 'Tour 360°', tour360Hint: 'Olhe ao redor do apartamento · no celular funciona com o giroscópio', leisure360: 'Lazer em 360°', leisureRenders: 'Áreas de lazer', leisurePlans: 'Plantas do lazer',
  panoGyro: 'Giroscópio', panoGyroHint: 'Mova o celular para olhar ao redor', panoGyroDenied: 'Permissão do giroscópio negada', panoGyroNone: 'Este aparelho não tem giroscópio', panoTapGyro: 'Toque em “Giroscópio” para olhar ao redor movendo o celular',
  panoAuto: 'Auto', panoAutoHint: 'Girar devagar quando parado', panoFull: 'Tela cheia', panoFullHint: 'Tela cheia', panoNoFull: 'Tela cheia não disponível aqui', panoVrHint: 'Coloque o celular no óculos Cardboard · toque em VR de novo para sair',
  panoLoadError: 'Não foi possível carregar esta panorâmica', plan: 'Planta', final: 'final',  open360: 'Abrir em 360°', realization: 'Realização', poweredBy: 'Powered by', markers360: 'Pontos 360°',
  tour: 'Tour', tourEnd: 'Concluir', skip: 'Pular abertura',
});
// ===== GRANRESERVA-END =====
