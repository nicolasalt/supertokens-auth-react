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
import * as React from "react";
import { PureComponent, ReactElement } from "react";

import { EmailPasswordAuthState, FeatureBaseProps } from "../types";
import EmailPassword from "../emailPassword";
import { EMAIL_PASSWORD_AUTH_STATE, EMAIL_VERIFICATION_MODE } from "../constants";
import { getWindowOrThrow } from "supertokens-website/lib/build/utils";
import SuperTokens from "../../../superTokens";

/*
 * Component.
 */

class EmailPasswordAuth extends PureComponent<FeatureBaseProps, EmailPasswordAuthState> {
    /*
     * Constructor.
     */
    constructor(props: FeatureBaseProps) {
        super(props);
        this.state = {
            status: EMAIL_PASSWORD_AUTH_STATE.LOADING
        };
    }

    /*
     * Methods.
     */
    getRecipeInstanceOrThrow = (): EmailPassword => {
        let instance;
        if (this.props.__internal !== undefined && this.props.__internal.instance !== undefined) {
            instance = this.props.__internal.instance;
        } else {
            instance = EmailPassword.getInstanceOrThrow();
        }
        return instance;
    };

    isEmailVerifiedAPI = async (): Promise<boolean> => {
        try {
            return await this.getRecipeInstanceOrThrow().isEmailVerified();
        } catch (e) {
            // In case of API failure, continue, do not break the application.
            return true;
        }
    };

    async componentDidMount(): Promise<void> {
        const sessionExists = this.getRecipeInstanceOrThrow().doesSessionExist();
        if (sessionExists === false) {
            const redirectToPath = getWindowOrThrow().location.pathname;
            return await this.getRecipeInstanceOrThrow().redirect({ action: "SIGN_IN_AND_UP" }, this.props.history, {
                redirectToPath
            });
        }

        // Update status to ready.
        this.setState({
            status: EMAIL_PASSWORD_AUTH_STATE.READY
        });

        // If email verification mode is off or optional, return.
        if (
            this.getRecipeInstanceOrThrow().getConfig().emailVerificationFeature.mode !==
            EMAIL_VERIFICATION_MODE.REQUIRED
        ) {
            return;
        }

        // Otherwise, make sure that the email is valid, otherwise, redirect to email validation screen.
        const isEmailVerified = await this.isEmailVerifiedAPI();
        if (isEmailVerified === false) {
            return await this.getRecipeInstanceOrThrow().redirect({ action: "VERIFY_EMAIL" }, this.props.history);
        }
        return;
    }

    /*
     * Render.
     */
    render = (): JSX.Element | null => {
        if (this.state.status === EMAIL_PASSWORD_AUTH_STATE.LOADING) {
            return null;
        }

        return this.props.children as ReactElement<any>;
    };
}

export default function EmailPasswordAuthWrapper(props: FeatureBaseProps): JSX.Element {
    const reactRouterDom = SuperTokens.getInstanceOrThrow().getReactRouterDom();
    if (reactRouterDom === undefined) {
        return <EmailPasswordAuth {...props} />;
    }

    const Component = reactRouterDom.withRouter(EmailPasswordAuth);
    return <Component {...props} />;
}
