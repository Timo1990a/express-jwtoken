/*
Author: Luca Scaringella
GitHub: LucaCode
©Copyright by Luca Scaringella
 */

import JwtEngine                   from "./lib/main/jwtEngine";
import {reqAuthenticated,reqNotAuthenticated,reqAuthenticatedAndContains} from "./lib/main/accessChecker";
import JwtEngineOptions            from "./lib/main/jwtEngineOptions";
import ModifierTokenEngine         from "./lib/modifierTokenEngine/modifierTokenEngine";
import {CookieMTE} from "./lib/modifierTokenEngine/cookieMTE";
import {AuthorizationHeadersMTE}   from "./lib/modifierTokenEngine/authorizationHeadersMTE";

const jwtEngine = JwtEngine.generateEngine;

export {
    jwtEngine,
    reqAuthenticated,
    reqNotAuthenticated,
    reqAuthenticatedAndContains,
    ModifierTokenEngine,
    CookieMTE,
    AuthorizationHeadersMTE,
    JwtEngineOptions
};

