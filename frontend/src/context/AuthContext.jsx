/* eslint-disable react-refresh/only-export-components */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { portalApi } from "../lib/portalApi";

const AuthContext = createContext(undefined);

const ROLE_COLUMNS = ["role", "user_role", "account_role", "portal_role"];
const FIRST_LOGIN_COLUMNS = [
	"is_first_login",
	"first_login",
	"must_change_password",
	"force_password_change",
];

function normalizeRole(rawRole) {
	if (!rawRole) return "Faculty";

	const normalized = String(rawRole).trim().toUpperCase();
	if (normalized === "HR") return "HR";
	if (normalized === "VPAA") return "VPAA";
	return "Faculty";
}

function detectFirstLoginFromUser(user) {
	const createdAt = user?.created_at;
	const lastSignInAt = user?.last_sign_in_at;
	if (!createdAt || !lastSignInAt) return false;

	const createdMs = new Date(createdAt).getTime();
	const lastMs = new Date(lastSignInAt).getTime();
	if (!Number.isFinite(createdMs) || !Number.isFinite(lastMs)) return false;

	return Math.abs(createdMs - lastMs) < 2000;
}

function readFirstLoginFlag(profile) {
	if (!profile) return null;

	for (const column of FIRST_LOGIN_COLUMNS) {
		const value = profile[column];
		if (typeof value === "boolean") return value;
		if (value === 1 || value === "1") return true;
		if (value === 0 || value === "0") return false;
		if (typeof value === "string") {
			if (value.toLowerCase() === "true") return true;
			if (value.toLowerCase() === "false") return false;
		}
	}

	return null;
}

function resolveRole(profile, user) {
	for (const column of ROLE_COLUMNS) {
		if (profile?.[column]) {
			return normalizeRole(profile[column]);
		}
	}

	const metadataRole = user?.app_metadata?.role || user?.user_metadata?.role;
	return normalizeRole(metadataRole);
}

export function AuthProvider({ children }) {
	const [session, setSession] = useState(null);
	const [user, setUser] = useState(null);
	const [role, setRole] = useState("Faculty");
	const [profile, setProfile] = useState(null);
	const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
	const [authLoading, setAuthLoading] = useState(true);
	const [profileLoading, setProfileLoading] = useState(false);

	const hydrateProfile = useCallback(async (currentUser) => {
		if (!currentUser) {
			setProfile(null);
			setRole("Faculty");
			setNeedsPasswordChange(false);
			return;
		}

		setProfileLoading(true);
		let profileRow = null;

		try {
			if (currentUser.email) {
				const byEmail = await portalApi
					.from("users")
					.select("*")
					.eq("domain_email", currentUser.email)
					.maybeSingle();

				if (!byEmail.error) {
					profileRow = byEmail.data;
				}
			}

			if (!profileRow && currentUser.email) {
				const byEmailFallback = await portalApi
					.from("users")
					.select("*")
					.eq("email", currentUser.email)
					.maybeSingle();

				if (!byEmailFallback.error) {
					profileRow = byEmailFallback.data;
				}
			}

			setProfile(profileRow);
			setRole(resolveRole(profileRow, currentUser));

			const firstLoginFromProfile = readFirstLoginFlag(profileRow);
			setNeedsPasswordChange(
				typeof firstLoginFromProfile === "boolean"
					? firstLoginFromProfile
					: detectFirstLoginFromUser(currentUser),
			);
		} catch (err) {
			console.error("Profile hydration error:", err);
			setProfile(null);
			setRole("Faculty");
			setNeedsPasswordChange(false);
		} finally {
			setProfileLoading(false);
		}
	}, []);

	useEffect(() => {
		let mounted = true;

		const boot = async () => {
			try {
				const { data } = await portalApi.auth.getSession();
				if (!mounted) return;

				const nextSession = data?.session ?? null;
				setSession(nextSession);
				setUser(nextSession?.user ?? null);
				
				// Mark auth as loaded IMMEDIATELY - hydrate profile in background
				setAuthLoading(false);
				
				// Then hydrate profile asynchronously without blocking
				if (nextSession?.user) {
					void hydrateProfile(nextSession.user);
				}
			} catch (err) {
				console.error("Auth boot error:", err);
				if (!mounted) return;
				setAuthLoading(false);
			}
		};

		void boot();

		const {
			data: { subscription },
		} = portalApi.auth.onAuthStateChange(async (_event, nextSession) => {
			if (!mounted) return;
			setSession(nextSession ?? null);
			setUser(nextSession?.user ?? null);
			if (nextSession?.user) {
				void hydrateProfile(nextSession.user);
			}
		});

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, [hydrateProfile]);

	useEffect(() => {
		if (!user) return;

		const userId = user?.id || user?.user_id || null;
		const userEmail = user?.email || user?.user_metadata?.email || null;

		const channel = portalApi
			.channel(`faculty-users-${userId || userEmail || "current"}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "users",
				},
				(payload) => {
					const changedRow = payload?.new || payload?.old || null;
					if (!changedRow) return;

					const changedUserId = changedRow.user_id || changedRow.id || null;
					const changedEmail = changedRow.domain_email || changedRow.email || null;
					const matchesUserId = userId !== null && String(changedUserId || "") === String(userId);
					const matchesEmail = Boolean(userEmail) && String(changedEmail || "").toLowerCase() === String(userEmail).toLowerCase();

					if (matchesUserId || matchesEmail) {
						void hydrateProfile(user);
					}
				},
			)
			.subscribe();

		return () => {
			portalApi.removeChannel(channel);
		};
	}, [hydrateProfile, user]);

	const refreshProfile = useCallback(async () => {
		await hydrateProfile(user);
	}, [hydrateProfile, user]);

	const signOut = useCallback(async () => {
		await portalApi.auth.signOut();
	}, []);

	const markFirstLoginComplete = useCallback(async () => {
		if (!user) {
			setNeedsPasswordChange(false);
			return;
		}

		if (!profile?.user_id && !user.email) {
			setNeedsPasswordChange(false);
			return;
		}

		for (const column of FIRST_LOGIN_COLUMNS) {
			const { error } = await portalApi
				.from("users")
				.update({ [column]: false })
				.eq(profile?.user_id ? "user_id" : "domain_email", profile?.user_id || user.email);

			if (!error) {
				break;
			}
		}

		setNeedsPasswordChange(false);
	}, [profile?.user_id, user, user?.email]);

	const value = useMemo(
		() => ({
			session,
			user,
			role,
			profile,
			needsPasswordChange,
			isLoading: authLoading,
			refreshProfile,
			signOut,
			markFirstLoginComplete,
		}),
		[
			session,
			user,
			role,
			profile,
			needsPasswordChange,
			authLoading,
			profileLoading,
			refreshProfile,
			signOut,
			markFirstLoginComplete,
		],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}
