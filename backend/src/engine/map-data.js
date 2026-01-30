/**
 * STAR TREK DIPLOMACY - Map Data
 * 
 * 3-Layer map with hyperspace bypass routes
 * 7 Factions, Turkey-style Breen position
 */

// Layer 3: Upper Hyperspace (bypass routes, no supply)
// Layer 2: Core Sector (all supply centers)
// Layer 1: Lower Hyperspace (bypass routes, no supply)

const SYSTEMS = {
    // ========== LAYER 3: UPPER HYPERSPACE ==========
    hyperspace_alpha: { name: "Hyperspace Alpha", layer: 3, faction: 'deepspace', supply: false, x: 0, y: 100, z: 0 },
    hyperspace_beta: { name: "Hyperspace Beta", layer: 3, faction: 'deepspace', supply: false, x: 50, y: 100, z: 0 },
    hyperspace_gamma: { name: "Hyperspace Gamma", layer: 3, faction: 'deepspace', supply: false, x: 100, y: 100, z: 0 },
    hyperspace_delta: { name: "Hyperspace Delta", layer: 3, faction: 'deepspace', supply: false, x: 50, y: 100, z: 50 },
    transwarp_north: { name: "Transwarp North", layer: 3, faction: 'deepspace', supply: false, x: 25, y: 100, z: 25 },
    transwarp_south: { name: "Transwarp South", layer: 3, faction: 'deepspace', supply: false, x: 75, y: 100, z: 25 },
    wormhole_terminus_a: { name: "Wormhole Terminus A", layer: 3, faction: 'deepspace', supply: false, x: 25, y: 100, z: 75 },
    wormhole_terminus_b: { name: "Wormhole Terminus B", layer: 3, faction: 'deepspace', supply: false, x: 75, y: 100, z: 75 },
    quantum_corridor: { name: "Quantum Corridor", layer: 3, faction: 'deepspace', supply: false, x: 50, y: 100, z: 100 },
    void_passage: { name: "Void Passage", layer: 3, faction: 'deepspace', supply: false, x: 100, y: 100, z: 100 },

    // ========== LAYER 2: CORE SECTOR ==========
    
    // -- Federation (5 home) --
    earth: { name: "Earth", layer: 2, faction: 'federation', supply: true, home: true, x: 20, y: 50, z: 30 },
    vulcan: { name: "Vulcan", layer: 2, faction: 'federation', supply: true, home: true, x: 15, y: 50, z: 40 },
    andoria: { name: "Andoria", layer: 2, faction: 'federation', supply: true, home: true, x: 25, y: 50, z: 20 },
    tellar: { name: "Tellar Prime", layer: 2, faction: 'federation', supply: true, home: true, x: 10, y: 50, z: 25 },
    rigel: { name: "Rigel", layer: 2, faction: 'federation', supply: true, home: true, x: 30, y: 50, z: 35 },
    
    // -- Klingon (5 home) --
    qonos: { name: "Qo'noS", layer: 2, faction: 'klingon', supply: true, home: true, x: 70, y: 50, z: 20 },
    tygokor: { name: "Ty'Gokor", layer: 2, faction: 'klingon', supply: true, home: true, x: 75, y: 50, z: 15 },
    narendra: { name: "Narendra III", layer: 2, faction: 'klingon', supply: true, home: true, x: 65, y: 50, z: 25 },
    boreth: { name: "Boreth", layer: 2, faction: 'klingon', supply: true, home: true, x: 80, y: 50, z: 25 },
    khitomer: { name: "Khitomer", layer: 2, faction: 'klingon', supply: true, home: true, x: 60, y: 50, z: 30 },
    
    // -- Romulan (4 home) --
    romulus: { name: "Romulus", layer: 2, faction: 'romulan', supply: true, home: true, x: 85, y: 50, z: 50 },
    remus: { name: "Remus", layer: 2, faction: 'romulan', supply: true, home: true, x: 90, y: 50, z: 45 },
    rator: { name: "Rator III", layer: 2, faction: 'romulan', supply: true, home: true, x: 80, y: 50, z: 55 },
    abraxas: { name: "Abraxas", layer: 2, faction: 'romulan', supply: true, home: true, x: 85, y: 50, z: 60 },
    
    // -- Cardassian (5 home) --
    cardassia: { name: "Cardassia Prime", layer: 2, faction: 'cardassian', supply: true, home: true, x: 50, y: 50, z: 60 },
    chintoka: { name: "Chin'toka", layer: 2, faction: 'cardassian', supply: true, home: true, x: 45, y: 50, z: 65 },
    septimus: { name: "Septimus III", layer: 2, faction: 'cardassian', supply: true, home: true, x: 55, y: 50, z: 70 },
    kelvas: { name: "Kelvas V", layer: 2, faction: 'cardassian', supply: true, home: true, x: 60, y: 50, z: 65 },
    rakal: { name: "Rakal", layer: 2, faction: 'cardassian', supply: true, home: true, x: 50, y: 50, z: 75 },
    
    // -- Ferengi (3 home) --
    ferenginar: { name: "Ferenginar", layer: 2, faction: 'ferengi', supply: true, home: true, x: 20, y: 50, z: 70 },
    volchok: { name: "Volchok Prime", layer: 2, faction: 'ferengi', supply: true, home: true, x: 15, y: 50, z: 75 },
    clarus: { name: "Clarus", layer: 2, faction: 'ferengi', supply: true, home: true, x: 25, y: 50, z: 80 },
    
    // -- Breen (6 home - Turkey position) --
    breen: { name: "Breen", layer: 2, faction: 'breen', supply: true, home: true, x: 10, y: 50, z: 90 },
    portas: { name: "Portas V", layer: 2, faction: 'breen', supply: true, home: true, x: 5, y: 50, z: 85 },
    dozaria: { name: "Dozaria", layer: 2, faction: 'breen', supply: true, home: true, x: 15, y: 50, z: 95 },
    breen_core: { name: "Breen Core", layer: 2, faction: 'breen', supply: true, home: true, x: 10, y: 50, z: 100 },
    breen_citadel: { name: "Breen Citadel", layer: 2, faction: 'breen', supply: true, home: true, x: 5, y: 50, z: 95 },
    breen_fortress: { name: "Breen Fortress", layer: 2, faction: 'breen', supply: true, home: true, x: 0, y: 50, z: 90 },
    
    // -- Breen Chokepoint --
    frozen_passage: { name: "Frozen Passage", layer: 2, faction: 'neutral', supply: false, x: 20, y: 50, z: 85 },
    breen_gateway: { name: "Breen Gateway", layer: 2, faction: 'neutral', supply: true, x: 25, y: 50, z: 85 },
    
    // -- Gorn (5 home) --
    gornar: { name: "Gornar", layer: 2, faction: 'gorn', supply: true, home: true, x: 90, y: 50, z: 80 },
    ssgaron: { name: "S'sgaron", layer: 2, faction: 'gorn', supply: true, home: true, x: 95, y: 50, z: 75 },
    seudath: { name: "Seudath", layer: 2, faction: 'gorn', supply: true, home: true, x: 85, y: 50, z: 85 },
    gorn_fortress: { name: "Gorn Fortress", layer: 2, faction: 'gorn', supply: true, home: true, x: 90, y: 50, z: 90 },
    gorn_colony: { name: "Gorn Colony", layer: 2, faction: 'gorn', supply: true, home: true, x: 95, y: 50, z: 85 },
    
    // -- Neutral Supply Centers --
    bajor: { name: "Bajor", layer: 2, faction: 'neutral', supply: true, x: 40, y: 50, z: 50 },
    ds9: { name: "Deep Space 9", layer: 2, faction: 'neutral', supply: true, x: 45, y: 50, z: 55 },
    betazed: { name: "Betazed", layer: 2, faction: 'neutral', supply: true, x: 30, y: 50, z: 45 },
    trill: { name: "Trill", layer: 2, faction: 'neutral', supply: true, x: 25, y: 50, z: 55 },
    risa: { name: "Risa", layer: 2, faction: 'neutral', supply: true, x: 20, y: 50, z: 60 },
    benzar: { name: "Benzar", layer: 2, faction: 'neutral', supply: true, x: 35, y: 50, z: 40 },
    organia: { name: "Organia", layer: 2, faction: 'neutral', supply: true, x: 55, y: 50, z: 35 },
    archanis: { name: "Archanis", layer: 2, faction: 'neutral', supply: true, x: 50, y: 50, z: 25 },
    nimbus: { name: "Nimbus III", layer: 2, faction: 'neutral', supply: true, x: 75, y: 50, z: 40 },
    freecloud: { name: "Freecloud", layer: 2, faction: 'neutral', supply: true, x: 30, y: 50, z: 65 },
    cestus: { name: "Cestus III", layer: 2, faction: 'neutral', supply: true, x: 70, y: 50, z: 75 },
    galorndon: { name: "Galorndon Core", layer: 2, faction: 'neutral', supply: true, x: 70, y: 50, z: 45 },
    starbase375: { name: "Starbase 375", layer: 2, faction: 'neutral', supply: true, x: 40, y: 50, z: 35 },
    gamma_outpost: { name: "Gamma Outpost", layer: 2, faction: 'neutral', supply: true, x: 35, y: 50, z: 80 },

    // ========== LAYER 1: LOWER HYPERSPACE ==========
    underspace_alpha: { name: "Underspace Alpha", layer: 1, faction: 'deepspace', supply: false, x: 0, y: 0, z: 0 },
    underspace_beta: { name: "Underspace Beta", layer: 1, faction: 'deepspace', supply: false, x: 50, y: 0, z: 0 },
    underspace_gamma: { name: "Underspace Gamma", layer: 1, faction: 'deepspace', supply: false, x: 100, y: 0, z: 0 },
    underspace_delta: { name: "Underspace Delta", layer: 1, faction: 'deepspace', supply: false, x: 50, y: 0, z: 50 },
    mycelial_north: { name: "Mycelial North", layer: 1, faction: 'deepspace', supply: false, x: 25, y: 0, z: 25 },
    mycelial_south: { name: "Mycelial South", layer: 1, faction: 'deepspace', supply: false, x: 75, y: 0, z: 25 },
    quantum_realm: { name: "Quantum Realm", layer: 1, faction: 'deepspace', supply: false, x: 50, y: 0, z: 75 },
    mirror_passage: { name: "Mirror Passage", layer: 1, faction: 'deepspace', supply: false, x: 50, y: 0, z: 100 },
};

// Horizontal connections within layers
const HYPERLANES = [
    // Federation internal
    ['earth', 'vulcan'], ['earth', 'andoria'], ['earth', 'tellar'],
    ['vulcan', 'rigel'], ['andoria', 'tellar'],
    
    // Klingon internal
    ['qonos', 'tygokor'], ['qonos', 'narendra'], ['qonos', 'boreth'],
    ['tygokor', 'khitomer'], ['boreth', 'khitomer'],
    
    // Romulan internal
    ['romulus', 'remus'], ['romulus', 'rator'], ['remus', 'abraxas'],
    ['rator', 'abraxas'],
    
    // Cardassian internal
    ['cardassia', 'chintoka'], ['cardassia', 'septimus'], ['cardassia', 'kelvas'],
    ['chintoka', 'rakal'], ['septimus', 'kelvas'],
    
    // Ferengi internal
    ['ferenginar', 'volchok'], ['ferenginar', 'clarus'], ['volchok', 'clarus'],
    
    // Breen internal (isolated cluster)
    ['breen', 'portas'], ['breen', 'dozaria'], ['portas', 'breen_core'],
    ['dozaria', 'breen_core'], ['breen_core', 'breen_citadel'],
    ['breen', 'breen_citadel'], ['portas', 'dozaria'],
    ['breen_citadel', 'breen_fortress'], ['breen_core', 'breen_fortress'],
    
    // Breen chokepoint (Turkey-style straits)
    ['breen', 'frozen_passage'],
    ['frozen_passage', 'breen_gateway'],
    ['breen_gateway', 'benzar'],
    ['breen_gateway', 'gamma_outpost'],
    
    // Gorn internal
    ['gornar', 'ssgaron'], ['gornar', 'seudath'], ['ssgaron', 'gorn_fortress'],
    ['seudath', 'gorn_colony'], ['gorn_fortress', 'gorn_colony'],
    
    // Cross-faction borders
    ['rigel', 'khitomer'], ['andoria', 'archanis'], ['archanis', 'tygokor'],
    ['vulcan', 'galorndon'], ['galorndon', 'romulus'],
    ['narendra', 'nimbus'], ['nimbus', 'rator'],
    ['earth', 'betazed'], ['betazed', 'bajor'], ['bajor', 'ds9'],
    ['ds9', 'chintoka'],
    ['kelvas', 'cestus'], ['cestus', 'gornar'],
    ['abraxas', 'seudath'],
    
    // Ferengi connections
    ['ferenginar', 'risa'], ['risa', 'trill'], ['trill', 'betazed'],
    ['volchok', 'freecloud'], ['freecloud', 'gamma_outpost'],
    ['clarus', 'freecloud'],
    
    // Central connections
    ['organia', 'qonos'], ['organia', 'boreth'], ['organia', 'starbase375'],
    ['starbase375', 'earth'], ['starbase375', 'benzar'],
    ['benzar', 'andoria'],
    
    // Upper Hyperspace internal
    ['hyperspace_alpha', 'hyperspace_beta'], ['hyperspace_beta', 'hyperspace_gamma'],
    ['hyperspace_gamma', 'hyperspace_delta'], ['hyperspace_delta', 'hyperspace_alpha'],
    ['transwarp_north', 'hyperspace_alpha'], ['transwarp_north', 'hyperspace_beta'],
    ['transwarp_south', 'hyperspace_gamma'], ['transwarp_south', 'hyperspace_delta'],
    ['wormhole_terminus_a', 'transwarp_north'], ['wormhole_terminus_b', 'transwarp_south'],
    ['quantum_corridor', 'wormhole_terminus_a'], ['quantum_corridor', 'wormhole_terminus_b'],
    ['void_passage', 'quantum_corridor'],
    
    // Lower Hyperspace internal
    ['underspace_alpha', 'underspace_beta'], ['underspace_beta', 'underspace_gamma'],
    ['underspace_gamma', 'underspace_delta'], ['underspace_delta', 'underspace_alpha'],
    ['mycelial_north', 'underspace_alpha'], ['mycelial_north', 'underspace_beta'],
    ['mycelial_south', 'underspace_gamma'], ['mycelial_south', 'underspace_delta'],
    ['quantum_realm', 'mycelial_north'], ['quantum_realm', 'mycelial_south'],
    ['mirror_passage', 'quantum_realm'],
];

// Vertical connections between layers
const VERTICAL_LANES = [
    // Upper Hyperspace access (Core → Layer 3)
    { from: 'earth', to: 'hyperspace_alpha' },
    { from: 'vulcan', to: 'wormhole_terminus_a' },
    { from: 'qonos', to: 'hyperspace_beta' },
    { from: 'khitomer', to: 'transwarp_north' },
    { from: 'romulus', to: 'hyperspace_gamma' },
    { from: 'rator', to: 'wormhole_terminus_b' },
    { from: 'cardassia', to: 'hyperspace_delta' },
    { from: 'chintoka', to: 'transwarp_south' },
    { from: 'breen_citadel', to: 'quantum_corridor' },
    { from: 'gornar', to: 'void_passage' },
    { from: 'ferenginar', to: 'wormhole_terminus_a' },
    { from: 'ds9', to: 'wormhole_terminus_b' },
    
    // Lower Hyperspace access (Core → Layer 1)
    { from: 'andoria', to: 'underspace_alpha' },
    { from: 'rigel', to: 'mycelial_north' },
    { from: 'tygokor', to: 'underspace_beta' },
    { from: 'boreth', to: 'quantum_realm' },
    { from: 'remus', to: 'underspace_gamma' },
    { from: 'abraxas', to: 'mycelial_south' },
    { from: 'septimus', to: 'underspace_delta' },
    { from: 'kelvas', to: 'mirror_passage' },
    { from: 'seudath', to: 'quantum_realm' },
    { from: 'volchok', to: 'underspace_alpha' },
    { from: 'clarus', to: 'underspace_gamma' },
];

// Faction colors for visualization
const FACTION_COLORS = {
    federation: '#3399ff',
    klingon: '#cc0000',
    romulan: '#006600',
    cardassian: '#996633',
    ferengi: '#ff9900',
    breen: '#66cccc',
    gorn: '#88aa33',
    neutral: '#888888',
    deepspace: '#333333'
};

module.exports = {
    SYSTEMS,
    HYPERLANES,
    VERTICAL_LANES,
    FACTION_COLORS
};
