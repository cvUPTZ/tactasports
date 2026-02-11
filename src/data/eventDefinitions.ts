
export interface EventDefinition {
    id: number;
    category: string;
    eventName: string;
    isRealTime: boolean;
    isPostMatch: boolean;
    clipDuration: number; // in seconds
    preRoll: number; // seconds before the event timestamp to start the clip
    description?: string;
}

export const EVENT_DEFINITIONS: EventDefinition[] = [
    // PHASES DE JEU GLOBALES
    { id: 1, category: "Phase de jeu", eventName: "Possession offensive", isRealTime: true, isPostMatch: true, clipDuration: 45, preRoll: 5 },
    { id: 2, category: "Phase de jeu", eventName: "Possession défensive", isRealTime: true, isPostMatch: true, clipDuration: 40, preRoll: 5 },
    { id: 3, category: "Phase de jeu", eventName: "Transition OFF-DEF", isRealTime: true, isPostMatch: true, clipDuration: 12, preRoll: 5 },
    { id: 4, category: "Phase de jeu", eventName: "Transition DEF-OFF", isRealTime: true, isPostMatch: true, clipDuration: 15, preRoll: 5 },
    { id: 5, category: "Phase de jeu", eventName: "Phase arrêtée offensive", isRealTime: true, isPostMatch: true, clipDuration: 30, preRoll: 5 },
    { id: 6, category: "Phase de jeu", eventName: "Phase arrêtée défensive", isRealTime: true, isPostMatch: true, clipDuration: 30, preRoll: 5 },

    // TYPES D'ATTAQUES
    { id: 7, category: "Offensive", eventName: "Attaque placée", isRealTime: false, isPostMatch: true, clipDuration: 45, preRoll: 10 },
    { id: 8, category: "Offensive", eventName: "Contre-attaque", isRealTime: true, isPostMatch: true, clipDuration: 12, preRoll: 5 },
    { id: 9, category: "Offensive", eventName: "Attaque rapide", isRealTime: false, isPostMatch: true, clipDuration: 20, preRoll: 5 },
    { id: 10, category: "Offensive", eventName: "Jeu direct", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 3 },
    { id: 11, category: "Offensive", eventName: "Pressing haut-Récup-Attaque", isRealTime: true, isPostMatch: true, clipDuration: 15, preRoll: 5 },

    // FINALISATION OFFENSIVE
    { id: 12, category: "Finalisation", eventName: "But marqué", isRealTime: true, isPostMatch: true, clipDuration: 35, preRoll: 15 },
    { id: 13, category: "Finalisation", eventName: "Tir cadré sauvé", isRealTime: true, isPostMatch: true, clipDuration: 15, preRoll: 5 },
    { id: 14, category: "Finalisation", eventName: "Tir non cadré", isRealTime: true, isPostMatch: true, clipDuration: 12, preRoll: 5 },
    { id: 15, category: "Finalisation", eventName: "Tir contré", isRealTime: true, isPostMatch: true, clipDuration: 12, preRoll: 5 },
    { id: 16, category: "Finalisation", eventName: "Occasion franche", isRealTime: true, isPostMatch: true, clipDuration: 18, preRoll: 8 },
    { id: 17, category: "Finalisation", eventName: "Occasion moyenne", isRealTime: false, isPostMatch: true, clipDuration: 15, preRoll: 5 },
    { id: 18, category: "Finalisation", eventName: "Passe décisive", isRealTime: false, isPostMatch: true, clipDuration: 18, preRoll: 8 },
    { id: 19, category: "Finalisation", eventName: "Passe clé", isRealTime: false, isPostMatch: true, clipDuration: 15, preRoll: 5 },
    { id: 20, category: "Finalisation", eventName: "Centre", isRealTime: true, isPostMatch: true, clipDuration: 12, preRoll: 5 },
    { id: 21, category: "Finalisation", eventName: "Centre rentrant", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 5 },
    { id: 22, category: "Finalisation", eventName: "Centre sortant", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 5 },

    // CONSTRUCTION OFFENSIVE
    { id: 23, category: "Construction", eventName: "Relance gardien courte", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 2 },
    { id: 24, category: "Construction", eventName: "Relance gardien longue", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 2 },
    { id: 25, category: "Construction", eventName: "Construction 3 défenseurs", isRealTime: false, isPostMatch: true, clipDuration: 25, preRoll: 5 },
    { id: 26, category: "Construction", eventName: "Construction 2 défenseurs", isRealTime: false, isPostMatch: true, clipDuration: 25, preRoll: 5 },
    { id: 27, category: "Construction", eventName: "Passe progressive", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 2 },
    { id: 28, category: "Construction", eventName: "Circulation latérale", isRealTime: false, isPostMatch: true, clipDuration: 20, preRoll: 5 },
    { id: 29, category: "Construction", eventName: "Combinaison courte (une-deux)", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 2 },
    { id: 30, category: "Construction", eventName: "Combinaison à 3+ joueurs", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 3 },

    // ACTIONS TECHNIQUES INDIVIDUELLES
    { id: 31, category: "Technique", eventName: "Dribble réussi", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 2 },
    { id: 32, category: "Technique", eventName: "Dribble raté", isRealTime: false, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 33, category: "Technique", eventName: "Passe courte réussie", isRealTime: false, isPostMatch: true, clipDuration: 4, preRoll: 2 },
    { id: 34, category: "Technique", eventName: "Passe moyenne réussie", isRealTime: false, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 35, category: "Technique", eventName: "Passe longue réussie", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 2 },
    { id: 36, category: "Technique", eventName: "Passe en profondeur", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 2 },
    { id: 37, category: "Technique", eventName: "Contrôle orienté", isRealTime: false, isPostMatch: true, clipDuration: 4, preRoll: 2 },
    { id: 38, category: "Technique", eventName: "Mauvais contrôle", isRealTime: false, isPostMatch: true, clipDuration: 4, preRoll: 2 },
    { id: 39, category: "Technique", eventName: "Passe ratée/interceptée", isRealTime: false, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 40, category: "Technique", eventName: "Geste technique spectaculaire", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 2 },

    // PERTES DE BALLE
    { id: 41, category: "Perte", eventName: "Interception adverse", isRealTime: true, isPostMatch: true, clipDuration: 6, preRoll: 2 },
    { id: 42, category: "Perte", eventName: "Mauvaise passe", isRealTime: true, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 43, category: "Perte", eventName: "Mauvais contrôle-Perte", isRealTime: false, isPostMatch: true, clipDuration: 4, preRoll: 2 },
    { id: 44, category: "Perte", eventName: "Duel perdu", isRealTime: false, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 45, category: "Perte", eventName: "Perte sous pression", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 3 },
    { id: 46, category: "Perte", eventName: "Faute commise", isRealTime: true, isPostMatch: true, clipDuration: 8, preRoll: 3 },
    { id: 47, category: "Perte", eventName: "Hors-jeu signalé", isRealTime: true, isPostMatch: true, clipDuration: 10, preRoll: 5 },

    // ACTIONS DÉFENSIVES
    { id: 48, category: "Défense", eventName: "Bloc bas organisé", isRealTime: false, isPostMatch: true, clipDuration: 30, preRoll: 5 },
    { id: 49, category: "Défense", eventName: "Bloc médian", isRealTime: false, isPostMatch: true, clipDuration: 25, preRoll: 5 },
    { id: 50, category: "Défense", eventName: "Pressing haut collectif", isRealTime: true, isPostMatch: true, clipDuration: 15, preRoll: 5 },
    { id: 51, category: "Défense", eventName: "Pressing médian", isRealTime: false, isPostMatch: true, clipDuration: 15, preRoll: 5 },
    { id: 52, category: "Défense", eventName: "Repli défensif organisé", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 5 },
    { id: 53, category: "Défense", eventName: "Repli défensif désorganisé", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 5 },
    { id: 54, category: "Défense", eventName: "Interception propre", isRealTime: false, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 55, category: "Défense", eventName: "Tacle réussi", isRealTime: false, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 56, category: "Défense", eventName: "Tacle raté/Faute", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 3 },
    { id: 57, category: "Défense", eventName: "Duel aérien gagné", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 2 },
    { id: 58, category: "Défense", eventName: "Duel aérien perdu", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 2 },
    { id: 59, category: "Défense", eventName: "Duel au sol gagné", isRealTime: false, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 60, category: "Défense", eventName: "Duel au sol perdu", isRealTime: false, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 61, category: "Défense", eventName: "Hors-jeu provoqué", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 5 },
    { id: 62, category: "Défense", eventName: "Couverture défensive", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 3 },
    { id: 63, category: "Défense", eventName: "Récupération haute", isRealTime: true, isPostMatch: true, clipDuration: 8, preRoll: 3 },
    { id: 64, category: "Défense", eventName: "Récupération médiane", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 3 },
    { id: 65, category: "Défense", eventName: "Récupération basse", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 3 },

    // RÉSULTATS DÉFENSIFS
    { id: 66, category: "Défense", eventName: "But encaissé", isRealTime: true, isPostMatch: true, clipDuration: 40, preRoll: 20 },
    { id: 67, category: "Défense", eventName: "Tir adverse cadré", isRealTime: true, isPostMatch: true, clipDuration: 15, preRoll: 5 },
    { id: 68, category: "Défense", eventName: "Tir adverse non cadré", isRealTime: true, isPostMatch: true, clipDuration: 12, preRoll: 5 },
    { id: 69, category: "Défense", eventName: "Occasion adverse", isRealTime: true, isPostMatch: true, clipDuration: 18, preRoll: 8 },
    { id: 70, category: "Défense", eventName: "Corner concédé", isRealTime: true, isPostMatch: true, clipDuration: 10, preRoll: 5 },
    { id: 71, category: "Défense", eventName: "Coup franc concédé dangereux", isRealTime: true, isPostMatch: true, clipDuration: 12, preRoll: 5 },
    { id: 72, category: "Défense", eventName: "Coup franc concédé non dangereux", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 3 },
    { id: 73, category: "Défense", eventName: "Pénalty concédé", isRealTime: true, isPostMatch: true, clipDuration: 25, preRoll: 5 },

    // PHASES ARRÊTÉES OFFENSIVES
    { id: 74, category: "PA Offensive", eventName: "Corner pour - Rentrant", isRealTime: true, isPostMatch: true, clipDuration: 20, preRoll: 2 },
    { id: 75, category: "PA Offensive", eventName: "Corner pour - Sortant", isRealTime: true, isPostMatch: true, clipDuration: 20, preRoll: 2 },
    { id: 76, category: "PA Offensive", eventName: "Corner pour - Court", isRealTime: false, isPostMatch: true, clipDuration: 18, preRoll: 2 },
    { id: 77, category: "PA Offensive", eventName: "Corner pour - Variante", isRealTime: false, isPostMatch: true, clipDuration: 20, preRoll: 2 },
    { id: 78, category: "PA Offensive", eventName: "Coup franc direct cadré", isRealTime: true, isPostMatch: true, clipDuration: 18, preRoll: 5 },
    { id: 79, category: "PA Offensive", eventName: "Coup franc direct non cadré", isRealTime: true, isPostMatch: true, clipDuration: 12, preRoll: 5 },
    { id: 80, category: "PA Offensive", eventName: "Coup franc indirect (centre)", isRealTime: false, isPostMatch: true, clipDuration: 20, preRoll: 5 },
    { id: 81, category: "PA Offensive", eventName: "Coup franc indirect (combinaison)", isRealTime: false, isPostMatch: true, clipDuration: 18, preRoll: 5 },
    { id: 82, category: "PA Offensive", eventName: "Pénalty pour", isRealTime: true, isPostMatch: true, clipDuration: 35, preRoll: 5 },
    { id: 83, category: "PA Offensive", eventName: "Touche offensive longue", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 2 },
    { id: 84, category: "PA Offensive", eventName: "Touche offensive courte", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 2 },
    { id: 85, category: "PA Offensive", eventName: "Remise 6 mètres adverse", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 2 },

    // PHASES ARRÊTÉES DÉFENSIVES
    { id: 86, category: "PA Défensive", eventName: "Corner contre - Défense zonale", isRealTime: false, isPostMatch: true, clipDuration: 25, preRoll: 5 },
    { id: 87, category: "PA Défensive", eventName: "Corner contre - Défense individuelle", isRealTime: false, isPostMatch: true, clipDuration: 25, preRoll: 5 },
    { id: 88, category: "PA Défensive", eventName: "Corner contre - Défense mixte", isRealTime: false, isPostMatch: true, clipDuration: 25, preRoll: 5 },
    { id: 89, category: "PA Défensive", eventName: "Coup franc contre - Mur", isRealTime: false, isPostMatch: true, clipDuration: 25, preRoll: 5 },
    { id: 90, category: "PA Défensive", eventName: "Coup franc contre - Sans mur", isRealTime: false, isPostMatch: true, clipDuration: 15, preRoll: 2 },
    { id: 91, category: "PA Défensive", eventName: "Pénalty contre", isRealTime: true, isPostMatch: true, clipDuration: 30, preRoll: 5 },
    { id: 92, category: "PA Défensive", eventName: "Touche défensive - Marquage serré", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 2 },
    { id: 93, category: "PA Défensive", eventName: "Touche défensive - Laisser jouer", isRealTime: false, isPostMatch: true, clipDuration: 30, preRoll: 2 },

    // GARDIEN DE BUT
    { id: 94, category: "Gardien", eventName: "Arrêt réflexe", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 2 },
    { id: 95, category: "Gardien", eventName: "Arrêt classique", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 2 },
    { id: 96, category: "Gardien", eventName: "Sortie aérienne réussie", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 2 },
    { id: 97, category: "Gardien", eventName: "Sortie aérienne ratée", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 2 },
    { id: 98, category: "Gardien", eventName: "Sortie aux pieds réussie", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 2 },
    { id: 99, category: "Gardien", eventName: "Sortie aux pieds ratée", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 2 },
    { id: 100, category: "Gardien", eventName: "Un contre un gagné", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 2 },
    { id: 101, category: "Gardien", eventName: "Un contre un perdu", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 2 },
    { id: 102, category: "Gardien", eventName: "Relance courte au pied", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 2 },
    { id: 103, category: "Gardien", eventName: "Relance longue au pied", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 2 },
    { id: 104, category: "Gardien", eventName: "Relance main précise", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 2 },
    { id: 105, category: "Gardien", eventName: "Relance main imprécise", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 2 },
    { id: 106, category: "Gardien", eventName: "Communication défensive", isRealTime: false, isPostMatch: true, clipDuration: 15, preRoll: 2 },

    // MOUVEMENTS SANS BALLON
    { id: 107, category: "Mouvement", eventName: "Appel de balle intelligent", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 2 },
    { id: 108, category: "Mouvement", eventName: "Appel de balle ignoré", isRealTime: false, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 109, category: "Mouvement", eventName: "Course en profondeur", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 2 },
    { id: 110, category: "Mouvement", eventName: "Décrochage", isRealTime: false, isPostMatch: true, clipDuration: 6, preRoll: 2 },
    { id: 111, category: "Mouvement", eventName: "Appel-contre-appel", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 2 },
    { id: 112, category: "Mouvement", eventName: "Soutien offensif", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 2 },
    { id: 113, category: "Mouvement", eventName: "Replacement défensif rapide", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 2 },
    { id: 114, category: "Mouvement", eventName: "Replacement défensif lent", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 2 },

    // DISCIPLINE
    { id: 115, category: "Discipline", eventName: "Carton jaune", isRealTime: true, isPostMatch: true, clipDuration: 15, preRoll: 2 },
    { id: 116, category: "Discipline", eventName: "Carton rouge direct", isRealTime: true, isPostMatch: true, clipDuration: 20, preRoll: 3 },
    { id: 117, category: "Discipline", eventName: "Second carton jaune-Rouge", isRealTime: true, isPostMatch: true, clipDuration: 20, preRoll: 3 },
    { id: 118, category: "Discipline", eventName: "Faute tactique", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 3 },
    { id: 119, category: "Discipline", eventName: "Simulation/Plongeon", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 3 },
    { id: 120, category: "Discipline", eventName: "Protestation", isRealTime: false, isPostMatch: true, clipDuration: 12, preRoll: 3 },

    // ÉVÉNEMENTS DE MATCH
    { id: 121, category: "Match", eventName: "Début 1ère mi-temps", isRealTime: true, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 122, category: "Match", eventName: "Fin 1ère mi-temps", isRealTime: true, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 123, category: "Match", eventName: "Début 2ème mi-temps", isRealTime: true, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 124, category: "Match", eventName: "Fin 2ème mi-temps", isRealTime: true, isPostMatch: true, clipDuration: 5, preRoll: 2 },
    { id: 125, category: "Match", eventName: "Temps additionnel", isRealTime: true, isPostMatch: true, clipDuration: 60, preRoll: 5 },
    { id: 126, category: "Match", eventName: "Blessure joueur", isRealTime: true, isPostMatch: true, clipDuration: 120, preRoll: 10 },
    { id: 127, category: "Match", eventName: "Remplacement", isRealTime: true, isPostMatch: true, clipDuration: 30, preRoll: 5 },
    { id: 128, category: "Match", eventName: "Changement tactique", isRealTime: true, isPostMatch: true, clipDuration: 180, preRoll: 10 },
    { id: 129, category: "Match", eventName: "Boisson technique", isRealTime: true, isPostMatch: true, clipDuration: 90, preRoll: 5 },
    { id: 130, category: "Match", eventName: "Incident arbitrage", isRealTime: true, isPostMatch: true, clipDuration: 30, preRoll: 5 },

    // MOMENTS PSYCHOLOGIQUES
    { id: 131, category: "Psycho", eventName: "Célébration but", isRealTime: false, isPostMatch: true, clipDuration: 15, preRoll: 2 },
    { id: 132, category: "Psycho", eventName: "Frustration visible", isRealTime: false, isPostMatch: true, clipDuration: 8, preRoll: 2 },
    { id: 133, category: "Psycho", eventName: "Encouragement collectif", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 2 },
    { id: 134, category: "Psycho", eventName: "Conflit interne équipe", isRealTime: false, isPostMatch: true, clipDuration: 20, preRoll: 5 },
    { id: 135, category: "Psycho", eventName: "Altercation adverse", isRealTime: false, isPostMatch: true, clipDuration: 25, preRoll: 5 },

    // STATISTIQUES PHYSIQUES
    { id: 136, category: "Physique", eventName: "Sprint longue distance (>30m)", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 2 },
    { id: 137, category: "Physique", eventName: "Effort défensif intense", isRealTime: false, isPostMatch: true, clipDuration: 15, preRoll: 3 },
    { id: 138, category: "Physique", eventName: "Signe de fatigue", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 2 },
    { id: 139, category: "Physique", eventName: "Récupération lente après effort", isRealTime: false, isPostMatch: true, clipDuration: 20, preRoll: 5 },

    // ANALYSE TACTIQUE AVANCÉE
    { id: 140, category: "Tactique", eventName: "Supériorité numérique créée", isRealTime: false, isPostMatch: true, clipDuration: 20, preRoll: 5 },
    { id: 141, category: "Tactique", eventName: "Infériorité numérique subie", isRealTime: false, isPostMatch: true, clipDuration: 20, preRoll: 5 },
    { id: 142, category: "Tactique", eventName: "Changement système en jeu", isRealTime: false, isPostMatch: true, clipDuration: 300, preRoll: 15 },
    { id: 143, category: "Tactique", eventName: "Automatisme travaillé réussi", isRealTime: false, isPostMatch: true, clipDuration: 15, preRoll: 5 },
    { id: 144, category: "Tactique", eventName: "Automatisme travaillé raté", isRealTime: false, isPostMatch: true, clipDuration: 15, preRoll: 5 },
    { id: 145, category: "Tactique", eventName: "Exploitation faiblesse adverse", isRealTime: false, isPostMatch: true, clipDuration: 25, preRoll: 5 },
    { id: 146, category: "Tactique", eventName: "Adaptation tactique réussie", isRealTime: false, isPostMatch: true, clipDuration: 180, preRoll: 10 },
    { id: 147, category: "Tactique", eventName: "Non-adaptation problématique", isRealTime: false, isPostMatch: true, clipDuration: 180, preRoll: 10 },

    // ZONES DU TERRAIN (Overlay)
    { id: 148, category: "Zone", eventName: "Zone défensive gauche", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 149, category: "Zone", eventName: "Zone défensive centre", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 150, category: "Zone", eventName: "Zone défensive droite", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 151, category: "Zone", eventName: "Zone médiane gauche", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 152, category: "Zone", eventName: "Zone médiane centre", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 153, category: "Zone", eventName: "Zone médiane droite", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 154, category: "Zone", eventName: "Zone offensive gauche", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 155, category: "Zone", eventName: "Zone offensive centre", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 156, category: "Zone", eventName: "Zone offensive droite", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 157, category: "Zone", eventName: "Grande surface adverse", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 158, category: "Zone", eventName: "Petite surface adverse", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 159, category: "Zone", eventName: "Couloir latéral gauche complet", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
    { id: 160, category: "Zone", eventName: "Couloir latéral droit complet", isRealTime: false, isPostMatch: true, clipDuration: 10, preRoll: 0 },
];
