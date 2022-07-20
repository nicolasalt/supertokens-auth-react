import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import bodyParser from "body-parser";
import supertokens from "supertokens-node";
import Session, { SessionContainer } from "supertokens-node/recipe/session";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { middleware, errorHandler } from "supertokens-node/framework/express";
import EmailVerification from "supertokens-node/recipe/emailverification";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import { RolesClaim } from "./claims/RolesClaim";
import { SecondFactorClaimValidators, SecondFactorOTPClaim } from "./claims/MFAClaim";
import { roleDB } from "./mockRoleDb";

// Change these values if you want to run the server on another adress
const apiPort = process.env.REACT_APP_API_PORT || 3001;
const apiDomain = process.env.REACT_APP_API_URL || `http://localhost:${apiPort}`;
const websitePort = process.env.REACT_APP_WEBSITE_PORT || 3000;
const websiteDomain = process.env.REACT_APP_WEBSITE_URL || `http://localhost:${websitePort}`;

supertokens.init({
    framework: "express",
    supertokens: {
        // TODO: This is a core hosted for demo purposes. You can use this, but make sure to change it to your core instance URI eventually.
        connectionURI: "https://try.supertokens.io",
    },
    appInfo: {
        appName: "SuperTokens Demo App", // TODO: Your app name
        apiDomain, // TODO: Change to your app's API domain
        websiteDomain, // TODO: Change to your app's website domain
    },
    recipeList: [
        EmailVerification.init({
            mode: "OPTIONAL",
        }),
        Session.init({
            override: {
                functions: (oI) => ({
                    ...oI,
                    getGlobalClaimValidators: (input) => {
                        console.log(
                            "Default validators: ",
                            input.claimValidatorsAddedByOtherRecipes.map((a) => a.id).join(", ")
                        );
                        return [...input.claimValidatorsAddedByOtherRecipes];
                    },
                    createNewSession: async (input) => {
                        input.accessTokenPayload = {
                            ...input.accessTokenPayload,
                            ...(await RolesClaim.build(input.userId, input.userContext)),
                            "app-custom-claim": { userId: input.userId, why: "Info" },
                        };
                        return oI.createNewSession(input);
                    },
                }),
            },
        }),
        EmailPassword.init({
            override: {
                functions: (oI) => ({
                    ...oI,
                    signUp: async function (input) {
                        const res = await oI.signUp(input);
                        if (res.status === "OK") {
                            if (res.user.email.includes("admin")) {
                                roleDB.set(res.user.id, ["admin"]);
                            } else {
                                roleDB.set(res.user.id, ["user"]);
                            }
                        }
                        return res;
                    },
                }),
            },
        }),
    ],
});

const app = express();
app.use(
    cors({
        origin: websiteDomain, // TODO: Change to your app's website domain
        allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
        methods: ["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);

app.use(
    helmet({
        contentSecurityPolicy: false,
    })
);
app.use(morgan("dev") as any);
app.use(bodyParser.json());

app.use(middleware() as any);

app.get(
    "/api1",
    verifySession({
        overrideGlobalClaimValidators: (_, defaultValidators) => [
            ...defaultValidators,
            RolesClaim.hasRole.including("admin"),
            SecondFactorClaimValidators.any2Factors,
        ],
    }) as any,
    async (req, res) => {
        const session: SessionContainer = (req as any).session;

        const roles = RolesClaim.getRolesFromSession(session);
        res.send({
            status: "OK",
            roles,
            mfaOTP: SecondFactorOTPClaim.getValueFromPayload(session.getAccessTokenPayload(), {}),
        });
    }
);

app.get(
    "/api2",
    verifySession() as any, // This only requires the default EmailVerifiedClaim
    async (req, res) => {
        const session: SessionContainer = (req as any).session;

        const roles = RolesClaim.getRolesFromSession(session);
        res.send({
            status: "OK",
            roles,
        });
    }
);

app.post("/second-factor", verifySession() as any, async (req, res) => {
    const session: SessionContainer = (req as any).session;
    await session.setClaimValue(SecondFactorOTPClaim, true);
    res.send({
        status: "OK",
    });
});

app.post(
    "/refresh-roles",
    verifySession() as any, // This only requires the default EmailVerifiedClaim
    async (req, res) => {
        const session: SessionContainer = (req as any).session;

        await RolesClaim.refreshRolesFromDb(session);

        res.send({
            status: "OK",
        });
    }
);

/************************* Utils *************************/
app.get(
    "/get-user-info",
    verifySession({ sessionRequired: false }), // This only requires the default EmailVerifiedClaim
    async (req, res) => {
        const session: SessionContainer | undefined = (req as any).session;
        let userId = session?.getUserId();
        if (req.params.userId) {
            userId = req.params.userId;
        }

        res.send({
            status: "OK",
        });
    }
);

app.post("/set-roles", async (req, res) => {
    roleDB.set(req.body.userId, req.body.roles);

    res.send({
        status: "OK",
    });
});

app.post("/verify-email", async (req, res) => {
    const user = await EmailPassword.getUserById(req.body.userId);
    if (req.body.unverify) {
        await EmailVerification.unverifyEmail(req.body.userId, user!.email);
    } else {
        const verifyToken = await EmailVerification.createEmailVerificationToken(req.body.userId, user!.email);
        if (verifyToken.status !== "OK") {
            res.send(verifyToken);
            return;
        }
        await EmailVerification.verifyEmailUsingToken(verifyToken.token);
    }
    res.send({
        status: "OK",
    });
});

app.use(errorHandler() as any);

app.use((err, req, res, next) => {
    res.status(500).send("Internal error: " + err.message);
});

app.listen(apiPort, () => console.log(`API Server listening on port ${apiPort}`));
