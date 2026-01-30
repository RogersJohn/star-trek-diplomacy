/**
 * Shared map data - used by both frontend and backend
 */

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

const FACTION_NAMES = {
    federation: 'United Federation of Planets',
    klingon: 'Klingon Empire',
    romulan: 'Romulan Star Empire',
    cardassian: 'Cardassian Union',
    ferengi: 'Ferengi Alliance',
    breen: 'Breen Confederacy',
    gorn: 'Gorn Hegemony'
};

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FACTION_COLORS, FACTION_NAMES };
}

export { FACTION_COLORS, FACTION_NAMES };
