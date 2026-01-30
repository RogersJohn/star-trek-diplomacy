/**
 * STAR TREK DIPLOMACY - Alliance System
 * 
 * Secret alliances with shared victory conditions.
 */

const ALLIANCE_TYPES = {
    MUTUAL_DEFENSE: {
        name: "Mutual Defense Pact",
        victoryMultiplier: 1.0,  // No shared victory discount
        shareLatinum: false,
        description: "Allies coordinate but win separately"
    },
    ECONOMIC_UNION: {
        name: "Economic Union",
        victoryMultiplier: 0.85,  // 85% of combined threshold
        shareLatinum: true,
        description: "Combined SC threshold, shared latinum"
    },
    FULL_ALLIANCE: {
        name: "Full Alliance",
        victoryMultiplier: 0.75,  // 75% of combined threshold
        shareLatinum: true,
        shareIntel: true,
        description: "Deep alliance with major victory discount"
    }
};

class AllianceManager {
    constructor() {
        this.alliances = [];
        this.proposals = [];
        this.betrayals = [];
    }
    
    /**
     * Propose an alliance
     */
    proposeAlliance(fromFaction, toFaction, type = 'ECONOMIC_UNION') {
        const proposal = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            from: fromFaction,
            to: toFaction,
            type,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        this.proposals.push(proposal);
        return proposal;
    }
    
    /**
     * Accept a proposal
     */
    acceptProposal(proposalId, acceptingFaction) {
        const proposal = this.proposals.find(p => p.id === proposalId);
        if (!proposal) return { success: false, reason: 'Proposal not found' };
        if (proposal.to !== acceptingFaction) return { success: false, reason: 'Not your proposal' };
        if (proposal.status !== 'pending') return { success: false, reason: 'Proposal already resolved' };
        
        // Check if either faction is already allied
        if (this.getAlliance(proposal.from) || this.getAlliance(proposal.to)) {
            proposal.status = 'rejected';
            return { success: false, reason: 'One faction already allied' };
        }
        
        proposal.status = 'accepted';
        return this.formAlliance(proposal.from, proposal.to, proposal.type);
    }
    
    /**
     * Reject a proposal
     */
    rejectProposal(proposalId, rejectingFaction) {
        const proposal = this.proposals.find(p => p.id === proposalId);
        if (!proposal) return { success: false, reason: 'Proposal not found' };
        if (proposal.to !== rejectingFaction) return { success: false, reason: 'Not your proposal' };
        
        proposal.status = 'rejected';
        return { success: true };
    }
    
    /**
     * Form an alliance
     */
    formAlliance(faction1, faction2, typeName = 'ECONOMIC_UNION', secret = true) {
        if (this.getAlliance(faction1) || this.getAlliance(faction2)) {
            return { success: false, reason: 'One or both factions already allied' };
        }
        
        const type = ALLIANCE_TYPES[typeName];
        const alliance = {
            id: `alliance-${Date.now()}`,
            members: [faction1, faction2],
            type,
            typeName,
            secret,
            formedAt: new Date().toISOString(),
            combinedThreshold: null  // Set when victory conditions known
        };
        
        this.alliances.push(alliance);
        
        return { 
            success: true, 
            alliance,
            message: `${faction1} and ${faction2} form ${type.name}`
        };
    }
    
    /**
     * Calculate combined victory threshold
     */
    calculateCombinedThreshold(faction1, faction2, victoryConditions) {
        const req1 = victoryConditions[faction1]?.supplyCenters || 12;
        const req2 = victoryConditions[faction2]?.supplyCenters || 12;
        const combined = req1 + req2;
        
        const alliance = this.getAlliance(faction1);
        if (alliance) {
            return Math.ceil(combined * alliance.type.victoryMultiplier);
        }
        
        return combined;
    }
    
    /**
     * Get alliance for a faction
     */
    getAlliance(faction) {
        return this.alliances.find(a => a.members.includes(faction));
    }
    
    /**
     * Check if two factions are allied
     */
    areAllied(faction1, faction2) {
        const alliance = this.getAlliance(faction1);
        return alliance && alliance.members.includes(faction2);
    }
    
    /**
     * Check for allied victory
     */
    checkAlliedVictory(gameState, victoryConditions) {
        for (const alliance of this.alliances) {
            const [f1, f2] = alliance.members;
            const sc1 = gameState.countSupplyCenters(f1);
            const sc2 = gameState.countSupplyCenters(f2);
            const combined = sc1 + sc2;
            
            const threshold = this.calculateCombinedThreshold(f1, f2, victoryConditions);
            
            if (combined >= threshold) {
                return {
                    victory: true,
                    winners: alliance.members,
                    type: 'allied_victory',
                    combinedSC: combined,
                    threshold,
                    breakdown: { [f1]: sc1, [f2]: sc2 }
                };
            }
        }
        
        return { victory: false };
    }
    
    /**
     * Break an alliance (betrayal)
     */
    breakAlliance(faction) {
        const alliance = this.getAlliance(faction);
        if (!alliance) return { success: false, reason: 'No alliance to break' };
        
        const otherMember = alliance.members.find(m => m !== faction);
        this.alliances = this.alliances.filter(a => a !== alliance);
        
        this.betrayals.push({
            betrayer: faction,
            betrayed: otherMember,
            timestamp: new Date().toISOString()
        });
        
        return { 
            success: true, 
            message: `${faction} betrays ${otherMember}!`,
            betrayed: otherMember
        };
    }
    
    /**
     * Get pending proposals for a faction
     */
    getPendingProposals(faction) {
        return this.proposals.filter(p => 
            p.status === 'pending' && (p.from === faction || p.to === faction)
        );
    }
    
    /**
     * Get all current alliances (for game master view)
     */
    getAllAlliances() {
        return this.alliances;
    }
    
    /**
     * Serialize for storage
     */
    toJSON() {
        return {
            alliances: this.alliances,
            proposals: this.proposals,
            betrayals: this.betrayals
        };
    }
    
    /**
     * Load from storage
     */
    static fromJSON(data) {
        const manager = new AllianceManager();
        manager.alliances = data.alliances || [];
        manager.proposals = data.proposals || [];
        manager.betrayals = data.betrayals || [];
        return manager;
    }
}

module.exports = {
    ALLIANCE_TYPES,
    AllianceManager
};
