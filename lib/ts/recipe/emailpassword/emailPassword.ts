/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

/*
 * Imports.
 */

import AuthRecipeModule from "../authRecipeModule";
import { CreateRecipeFunction, RouteToFeatureComponentMap, NormalisedAppInfo, SuccessAPIResponse } from "../../types";
import {
    EmailPasswordConfig,
    EmailPasswordGetRedirectionURLContext,
    EmailPasswordUserInput,
    NormalisedEmailPasswordConfig
} from "./types";
import { isTest } from "../../utils";
import { normaliseEmailPasswordConfig } from "./utils";
import { ResetPasswordUsingToken, SignInAndUp } from ".";
import NormalisedURLPath from "../../normalisedURLPath";
import { DEFAULT_RESET_PASSWORD_PATH } from "./constants";
import { SSR_ERROR } from "../../constants";
import RecipeModule from "../recipeModule";
import { NormalisedAuthRecipeConfig } from "../authRecipeModule/types";

/*
 * Class.
 */
export default class EmailPassword extends AuthRecipeModule {
    /*
     * Static Attributes.
     */
    static instance?: EmailPassword;
    static RECIPE_ID = "emailpassword";

    /*
     * Instance Attributes.
     */
    config: NormalisedEmailPasswordConfig & NormalisedAuthRecipeConfig;

    /*
     * Constructor.
     */
    constructor(config: EmailPasswordConfig) {
        super(config);
        this.config = {
            ...this.config,
            ...normaliseEmailPasswordConfig(config)
        };
    }

    /*
     * Instance methods.
     */

    getFeatures = (): RouteToFeatureComponentMap => {
        let features: RouteToFeatureComponentMap = {};
        if (this.config.signInAndUpFeature.disableDefaultImplementation !== true) {
            const normalisedFullPath = this.appInfo.websiteBasePath.appendPath(new NormalisedURLPath("/"));
            features[normalisedFullPath.getAsStringDangerous()] = SignInAndUp;
        }

        if (this.config.resetPasswordUsingTokenFeature.disableDefaultImplementation !== true) {
            const normalisedFullPath = this.appInfo.websiteBasePath.appendPath(
                new NormalisedURLPath(DEFAULT_RESET_PASSWORD_PATH)
            );
            features[normalisedFullPath.getAsStringDangerous()] = ResetPasswordUsingToken;
        }

        if (this.emailVerification !== undefined) {
            features = {
                ...features,
                ...this.emailVerification.getFeatures()
            };
        }

        return features;
    };

    getDefaultRedirectionURL = async (context: EmailPasswordGetRedirectionURLContext): Promise<string> => {
        if (context.action === "RESET_PASSWORD") {
            const resetPasswordPath = new NormalisedURLPath(DEFAULT_RESET_PASSWORD_PATH);
            return `${this.appInfo.websiteBasePath.appendPath(resetPasswordPath).getAsStringDangerous()}?rid=${
                this.recipeId
            }`;
        }

        return this.getAuthRecipeModuleDefaultRedirectionURL(context);
    };

    /*
     * Static methods.
     */

    static init(config?: EmailPasswordUserInput): CreateRecipeFunction {
        return (appInfo: NormalisedAppInfo): RecipeModule => {
            EmailPassword.instance = new EmailPassword({
                ...config,
                appInfo,
                recipeId: EmailPassword.RECIPE_ID
            });
            return EmailPassword.instance;
        };
    }

    static signOut(): Promise<SuccessAPIResponse> {
        return EmailPassword.getInstanceOrThrow().signOut();
    }

    static async isEmailVerified(): Promise<boolean> {
        return await EmailPassword.getInstanceOrThrow().isEmailVerified();
    }

    static getInstanceOrThrow(): EmailPassword {
        if (EmailPassword.instance === undefined) {
            let error =
                "No instance of EmailPassword found. Make sure to call the EmailPassword.init method." +
                "See https://supertokens.io/docs/emailpassword/starter-guide/frontend";

            // eslint-disable-next-line supertokens-auth-react/no-direct-window-object
            if (typeof window === "undefined") {
                error = error + SSR_ERROR;
            }
            throw Error(error);
        }

        return EmailPassword.instance;
    }

    /*
     * Tests methods.
     */
    static reset(): void {
        if (!isTest()) {
            return;
        }

        EmailPassword.instance = undefined;
        return;
    }
}
