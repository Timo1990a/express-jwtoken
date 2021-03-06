/*
Author: Luca Scaringella
GitHub: LucaCode
©Copyright by Luca Scaringella
 */

import express           = require('express');
import crypto            = require('crypto');
const jwt                = require('jsonwebtoken');
import JwtEngineOptions, {InternalJwtEngineOptions} from "./jwtEngineOptions";
import JwtToken                    from "./jwtToken";
// noinspection TypeScriptPreferShortImport
import {CookieCTE}                 from "../clientTokenEngine/cookieCTE";
import ClientTokenEngine           from "../clientTokenEngine/clientTokenEngine";

declare module 'express-serve-static-core' {
    interface Request {
        /**
         * The token of the request.
         * It is null if no singed token was provided or the singed token was not valid.
         */
        token : JwtToken | null;

        /**
         * The signed token of the request.
         * It is null if no singed token was provided.
         */
        signedToken : string | null;
    }
    interface Response {
        /**
         * This method will tell the client with the response to remove the token
         * and will remove the token and signed token from the request.
         */
        deauthenticate : () => Promise<void>

        /**
         * This method will authenticate the client by creating a JSON web token
         * and attach it to the client and the request.
         * You also can use this method to refresh a token,
         * but notice that the token payload will not be merged with the old token payload.
         * @param token
         * @return The singed token
         */
        authenticate : (token ?: Record<string,any>) => Promise<string>
    }
}

export type ExpressMiddlewareFunction = (req: express.Request, res: express.Response, next: express.NextFunction) => void;

interface SignOptions {
    algorithm ?: string,
    expiresIn ?: number | string,
    notBefore ?: number | string
}

interface VerifyOptions {
    algorithms : string[],
}

export default class JwtEngine {

    private readonly _options : InternalJwtEngineOptions;
    private readonly _signOptions : SignOptions;
    private readonly _verifyOptions : VerifyOptions;
    private readonly _clientTokenEngine : ClientTokenEngine;

    constructor(options: JwtEngineOptions){
        this._options = JwtEngine.processOptions(options);

        //sign options
        this._signOptions = {
            algorithm : this._options.algorithm,
            expiresIn : this._options.expiresIn
        };
        if(this._options.notBefore){
            this._signOptions.notBefore = this._options.notBefore;
        }

        //verify options
        this._verifyOptions = {
            algorithms : [this._options.algorithm]
        };

        this._clientTokenEngine = this._options.clientTokenEngine;
    }

    /**
     * Method for creating the JwtEngine.
     * Notice that the default options will try to save and load the token from the cookies,
     * so make sure you use the cookie-parser before or use custom options.
     * @param options
     */
    static generateEngine(options: JwtEngineOptions = {}): ExpressMiddlewareFunction {
        const jwtEngine = new JwtEngine(options);

        return async (req, res, next) => {

            await jwtEngine.verify(req,res);

            res.deauthenticate = async () => {
                req.token = null;
                req.signedToken = null;
                await jwtEngine._clientTokenEngine.removeToken(res);
            };

            res.authenticate = async (token = {}) => {
                return await jwtEngine.sign(token,req,res);
            };

            next();
        };
    }

    /**
     * Sign a token.
     * @param token
     * @param req
     * @param res
     */
    async sign(token : Record<string,any>, req : express.Request, res : express.Response) : Promise<string> {
        const signedToken = await new Promise<string>(((resolve, reject) => {
            jwt.sign(token,this._options.privateKey,this._signOptions,
                (err : any, signedToken : string) => {
                err ? reject(err) : resolve(signedToken);
            });
        }));
        req.token = token;
        req.signedToken = signedToken;
        await this._clientTokenEngine.setToken(signedToken,token,res);
        return signedToken;
    }

    /**
     * Try to verify the singed token of an request.
     * @param req
     * @param res
     */
    async verify(req : express.Request, res : express.Response) {
        const signedToken = await this._clientTokenEngine.getToken(req);
        if(signedToken !== null) {
            req.signedToken = signedToken;
            try {
                req.token = await new Promise(((resolve, reject) => {
                    jwt.verify(signedToken,this._options.publicKey,this._verifyOptions,
                        (err : any, token : Record<string,any>) => {
                        err ? reject(err) : resolve(token);
                    });
                }));
            }
            catch (e) {
                req.token = null;
                await this._clientTokenEngine.removeToken(res);
                await this._options.onNotValidToken(signedToken,req,res);
            }
        }
        else {
            req.signedToken = null;
            req.token = null;
        }
    }

    /**
     * Process the JwtEngineOptions and loading default options.
     * @param options
     */
    static processOptions(options: JwtEngineOptions): InternalJwtEngineOptions {
        //set the private/public keys to secret key.
        let publicKey = options.publicKey;
        let privateKey = options.privateKey;
        if (!(publicKey && privateKey)) {
            //load secret key default
            options.secretKey = options.secretKey || crypto.randomBytes(32).toString('hex');
            publicKey = options.secretKey;
            privateKey = options.secretKey;
        }

        return {
            publicKey,
            privateKey,
            algorithm : options.algorithm || 'HS256',
            expiresIn : options.expiresIn || '1 day',
            notBefore : options.notBefore,
            clientTokenEngine : options.clientTokenEngine || CookieCTE(),
            onNotValidToken : options.onNotValidToken || (() => {})
        };
    }
}



