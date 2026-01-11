"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

export default function ParentProfilePage() {
    const router = useRouter();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [message, setMessage] = useState("");
    const [fullName, setFullName] = useState("");
    const [savingName, setSavingName] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [savingPhone, setSavingPhone] = useState(false);
    const [addressText, setAddressText] = useState("");
    const [savingAddress, setSavingAddress] = useState(false);

    const loadProfile = async () => {
        setLoading(true);
        setMessage("");

        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
            router.push("/auth/sign-in");
            return;
        }

        const { data: profileData, error } = await supabase
            .from("profiles")
            .select("id, role, full_name, phone_number, avatar_url, address_text")
            .eq("id", user.id)
            .single();

        if (error) {
            setMessage(error.message);
            setLoading(false);
            return;
        }

        if (!profileData || profileData.role !== "parent") {
            router.push("/auth/sign-in");
            return;
        }

        setProfile(profileData);
        setFullName(profileData?.full_name || "");
        setPhoneNumber(profileData?.phone_number || "");
        setAddressText(profileData?.address_text || "");
        setLoading(false);
    };

    const saveName = async () => {
        console.log("saveName clicked", fullName);
        setMessage("");
        setSavingName(true);

        try {
            const { data: auth } = await supabase.auth.getUser();
            const user = auth?.user;
            if (!user) {
                router.push("/auth/sign-in");
                return;
            }

            const name = (fullName || "").trim();
            if (name.length < 2) throw new Error("Please enter your full name.");

            const { error } = await supabase
                .from("profiles")
                .update({ full_name: name })
                .eq("id", user.id);

            if (error) throw error;

            setMessage("Name updated.");
            await loadProfile();
        } catch (e) {
            setMessage(e?.message || "Could not save name.");
        } finally {
            setSavingName(false);
        }
    };

    const savePhoneNumber = async () => {
        setMessage("");
        setSavingPhone(true);

        try {
            const { data: auth } = await supabase.auth.getUser();
            const user = auth?.user;
            if (!user) {
                router.push("/auth/sign-in");
                return;
            }

            const phone = (phoneNumber || "").trim();

            // Keep it simple: allow blank, or require at least 7 chars if provided
            if (phone && phone.length < 7) throw new Error("Please enter a valid phone number.");

            const { error } = await supabase
                .from("profiles")
                .update({ phone_number: phone || null })
                .eq("id", user.id);

            if (error) throw error;

            setMessage("Phone number updated.");
            await loadProfile();
        } catch (e) {
            setMessage(e?.message || "Could not save phone number.");
        } finally {
            setSavingPhone(false);
        }
    };

    const saveAddress = async () => {
        setMessage("");
        setSavingAddress(true);

        try {
            const { data: auth } = await supabase.auth.getUser();
            const user = auth?.user;
            if (!user) {
                router.push("/auth/sign-in");
                return;
            }

            const addr = (addressText || "").trim();

            // allow blank. If provided, require something non-trivial.
            if (addr && addr.length < 6) throw new Error("Please enter a valid address (or leave it blank).");

            const { error } = await supabase
                .from("profiles")
                .update({ address_text: addr || null })
                .eq("id", user.id);

            if (error) throw error;

            setMessage("Address updated.");
            await loadProfile();
        } catch (e) {
            setMessage(e?.message || "Could not save address.");
        } finally {
            setSavingAddress(false);
        }
    };

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const uploadAvatar = async (file) => {
        setMessage("");
        setUploading(true);

        try {
            const { data: auth } = await supabase.auth.getUser();
            const user = auth?.user;
            if (!user) {
                router.push("/auth/sign-in");
                return;
            }

            // basic file validation
            if (!file) throw new Error("No file selected.");
            if (!file.type.startsWith("image/")) throw new Error("Please upload an image file.");
            if (file.size > 3 * 1024 * 1024) throw new Error("Please upload an image under 3MB.");

            // Use a fixed filename so re-upload replaces it
            const ext = file.name.split(".").pop() || "jpg";
            const path = `${user.id}/avatar.${ext}`;

            // Upload (upsert true so it replaces)
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(path, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Public URL (bucket is public)
            const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
            const publicUrl = publicUrlData?.publicUrl;

            if (!publicUrl) throw new Error("Could not get public URL for uploaded image.");

            // Update profile record
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: publicUrl })
                .eq("id", user.id);

            if (updateError) throw updateError;

            setMessage("Profile photo updated.");
            await loadProfile();
        } catch (e) {
            setMessage(e?.message || "Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const removeAvatar = async () => {
        setMessage("");
        setDeleting(true);

        try {
            const { data: auth } = await supabase.auth.getUser();
            const user = auth?.user;
            if (!user) {
                router.push("/auth/sign-in");
                return;
            }

            // Remove all possible avatar files for this user (covers jpg/png/webp)
            const { data: listData, error: listError } = await supabase.storage
                .from("avatars")
                .list(user.id, { limit: 50 });

            if (listError) throw listError;

            const files = (listData || []).map((f) => `${user.id}/${f.name}`);
            if (files.length) {
                const { error: removeError } = await supabase.storage.from("avatars").remove(files);
                if (removeError) throw removeError;
            }

            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: null })
                .eq("id", user.id);

            if (updateError) throw updateError;

            setMessage("Profile photo removed.");
            await loadProfile();
        } catch (e) {
            setMessage(e?.message || "Delete failed.");
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
                <div style={{ maxWidth: 720, margin: "0 auto" }}>Loading...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Edit profile</h1>
                        <p style={{ margin: "6px 0 0", color: "#555" }}>Update your profile photo.</p>
                    </div>
                    <Link href="/parent/dashboard" style={{ textDecoration: "none", fontWeight: 800, color: "#1f7aea" }}>
                        ← Back to dashboard
                    </Link>
                </div>

                {message && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fff", border: "1px solid #eee" }}>
                        {message}
                    </div>
                )}

                <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: "#fff", border: "1px solid #eee" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                            <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "#e9eefc" }}>
                                {profile?.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt="Profile"
                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: 900,
                                            color: "#1f7aea",
                                            fontSize: 26,
                                        }}
                                    >
                                        {(profile?.full_name || "P").slice(0, 1).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1, minWidth: 220 }}>
                                <div style={{ fontWeight: 900, fontSize: 18 }}>{profile?.full_name || "Parent"}</div>
                                <div style={{ color: "#555", marginTop: 4 }}>Account type: {profile?.role || "parent"}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <label
                                style={{
                                    background: "#1f7aea",
                                    color: "#fff",
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    fontWeight: 900,
                                    cursor: uploading ? "not-allowed" : "pointer",
                                    opacity: uploading ? 0.7 : 1,
                                }}
                            >
                                {uploading ? "Uploading..." : "Upload new photo"}
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    disabled={uploading}
                                    onChange={(e) => uploadAvatar(e.target.files?.[0])}
                                />
                            </label>

                            <button
                                onClick={removeAvatar}
                                disabled={deleting || uploading || !profile?.avatar_url}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #ddd",
                                    background: "#fff",
                                    fontWeight: 900,
                                    cursor: deleting || uploading ? "not-allowed" : "pointer",
                                    opacity: deleting || uploading ? 0.7 : 1,
                                }}
                            >
                                {deleting ? "Removing..." : "Remove photo"}
                            </button>
                        </div>

                        <p style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
                            Tip: use a square image for best results. Max size 3MB.
                        </p>

                        {/* full name */}
                        <div style={{ marginTop: 14 }}>
                            <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>Full name</label>
                            <input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g. Alice Bing"
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 10,
                                    border: "1px solid #ddd",
                                    background: "#fff",
                                }}
                            />

                            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                    type="button"
                                    onClick={saveName}
                                    disabled={savingName}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "none",
                                        background: "#1f7aea",
                                        color: "#fff",
                                        fontWeight: 900,
                                        cursor: savingName ? "not-allowed" : "pointer",
                                        opacity: savingName ? 0.7 : 1,
                                    }}
                                >
                                    {savingName ? "Saving..." : "Save name"}
                                </button>
                            </div>
                        </div>

                        {/* phone number */}
                        <div style={{ marginTop: 14 }}>
                            <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>Phone number</label>
                            <input
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="e.g. 021 123 4567"
                                type="tel"
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 10,
                                    border: "1px solid #ddd",
                                    background: "#fff",
                                }}
                            />

                            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                    type="button"
                                    onClick={savePhoneNumber}
                                    disabled={savingPhone}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid #ddd",
                                        background: "#fff",
                                        fontWeight: 900,
                                        cursor: savingPhone ? "not-allowed" : "pointer",
                                        opacity: savingPhone ? 0.7 : 1,
                                    }}
                                >
                                    {savingPhone ? "Saving..." : "Save phone"}
                                </button>
                            </div>
                        </div>

                        {/* address */}
                        <div style={{ marginTop: 14 }}>
                            <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>Address (for in person lessons)</label>
                            <input
                                value={addressText}
                                onChange={(e) => setAddressText(e.target.value)}
                                placeholder="e.g. 12 Example Street, Suburb, Auckland"
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 10,
                                    border: "1px solid #ddd",
                                    background: "#fff",
                                }}
                            />

                            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                    type="button"
                                    onClick={saveAddress}
                                    disabled={savingAddress}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid #ddd",
                                        background: "#fff",
                                        fontWeight: 900,
                                        cursor: savingAddress ? "not-allowed" : "pointer",
                                        opacity: savingAddress ? 0.7 : 1,
                                    }}
                                >
                                    {savingAddress ? "Saving..." : "Save address"}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
