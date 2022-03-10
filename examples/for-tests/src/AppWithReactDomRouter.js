import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { getSuperTokensRoutesForReactRouterDom } from "supertokens-auth-react";
import { SignInAndUp } from "supertokens-auth-react/recipe/emailpassword";
import {
    ResetPasswordUsingToken,
    SignInAndUp as TPSignInAndUp,
    SignInAndUpCallback,
} from "supertokens-auth-react/recipe/thirdpartyemailpassword";
import { BaseComponent, Home, Contact, Dashboard, DashboardNoAuthRequired } from "./App";
import Auth from "./Auth";

function AppWithReactDomRouter(props) {
    return (
        <div className="App">
            <Router>
                <BaseComponent>
                    <Routes caseSensitive>
                        {getSuperTokensRoutesForReactRouterDom(require("react-router-dom"))}
                        <Route path="/" element={<Home />} />
                        <Route
                            path="/CasE/Case-SensItive1-PAth"
                            element={
                                <Auth {...props}>
                                    <Dashboard />
                                </Auth>
                            }
                        />

                        <Route
                            path="/dashboard-no-auth"
                            element={
                                <Auth requireAuth={false} {...props}>
                                    <DashboardNoAuthRequired />
                                </Auth>
                            }
                        />

                        {/* Logged In Components */}
                        <Route
                            path="/dashboard"
                            element={
                                <Auth {...props}>
                                    <Dashboard />
                                </Auth>
                            }
                        />
                        <Route
                            path="/redirect-to-this-custom-path"
                            element={
                                <Auth {...props}>
                                    <Dashboard />
                                </Auth>
                            }
                        />

                        <Route path="/contact" element={<Contact />} />
                        <Route path="/custom-supertokens-login" element={<SignInAndUp />} />

                        {/* User context paths */}
                        <Route
                            path="/auth/reset-password"
                            element={
                                <ResetPasswordUsingToken
                                    userContext={{
                                        key: "value",
                                    }}
                                />
                            }
                        />

                        <Route
                            path="/auth/customcallback/auth0"
                            element={
                                <SignInAndUpCallback
                                    userContext={{
                                        key: "value",
                                    }}
                                />
                            }
                        />

                        <Route
                            path="/auth"
                            element={
                                <TPSignInAndUp
                                    userContext={{
                                        key: "value",
                                    }}
                                />
                            }
                        />
                    </Routes>
                </BaseComponent>
            </Router>
        </div>
    );
}

export default AppWithReactDomRouter;
