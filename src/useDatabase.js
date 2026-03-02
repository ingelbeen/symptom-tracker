// src/useDatabase.js — v2 with adherence tracking
import { supabase } from "./supabaseClient";

export function useDatabase(userId) {
  // ─── Profile ───
  const getProfile = async () => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  };
  const upsertProfile = async (profile) => {
    const { data, error } = await supabase.from("profiles").upsert({ id: userId, ...profile }).select().single();
    if (error) throw error;
    return data;
  };

  // ─── Episodes ───
  const getEpisodes = async () => {
    const { data, error } = await supabase.from("episodes").select("*").eq("user_id", userId).order("start_date", { ascending: false });
    if (error) throw error;
    return data;
  };
  const getActiveEpisodes = async () => {
    const { data, error } = await supabase.from("episodes").select("*").eq("user_id", userId).eq("status", "active");
    if (error) throw error;
    return data;
  };
  const createEpisode = async (ep) => {
    const { data, error } = await supabase.from("episodes").insert({
      user_id: userId, syndrome_id: ep.syndrome?.id, syndrome_label: ep.syndrome?.label,
      syndrome_icon: ep.syndrome?.icon, start_date: ep.startDate, status: "active",
      symptoms: ep.symptoms, severity_value: ep.severity?.value,
      severity_label: ep.severity?.label, notes: ep.notes, last_check_in: ep.startDate,
    }).select().single();
    if (error) throw error;
    return data;
  };
  const updateEpisode = async (episodeId, updates) => {
    const { data, error } = await supabase.from("episodes").update(updates).eq("id", episodeId).eq("user_id", userId).select().single();
    if (error) throw error;
    return data;
  };

  // ─── Daily Logs ───
  const addDailyLog = async (episodeId, log) => {
    const { data, error } = await supabase.from("daily_logs").insert({
      episode_id: episodeId, user_id: userId, log_date: log.date,
      feeling: log.feeling, resolved_symptoms: log.gone || [],
      new_symptoms: log.added || [],
      severity_value: log.severity?.value, severity_label: log.severity?.label,
    }).select().single();
    if (error) throw error;
    return data;
  };

  // ─── Healthcare Visits ───
  const addVisit = async (episodeId, visit) => {
    const { data, error } = await supabase.from("healthcare_visits").insert({
      episode_id: episodeId, user_id: userId,
      visit_type: visit.type, visit_date: visit.date,
      outcome: visit.outcome, prescribed_ab: visit.prescribedAb,
      advice_self_care: visit.adviceSelfCare, notes: visit.notes,
    }).select().single();
    if (error) throw error;
    return data;
  };
  const getVisitsForEpisode = async (episodeId) => {
    const { data, error } = await supabase.from("healthcare_visits").select("*").eq("episode_id", episodeId).order("visit_date");
    if (error) throw error;
    return data;
  };

  // ─── Medicines ───
  const addMedicine = async (episodeId, med) => {
    const { data, error } = await supabase.from("medicines").insert({
      episode_id: episodeId, user_id: userId,
      drug_name: med.drugName, custom_drug_name: med.customName,
      is_antibiotic: med.isAb, source: med.source,
      days_from_onset: med.daysFromOnset,
      presc_duration_days: med.prescDays ? parseInt(med.prescDays) : null,
      delayed_prescription: med.delayed,
      course_completed: med.completed, not_completed_reason: med.notCompletedReason,
      start_date: med.startDate,
      adherence_status: med.isAb ? "taking" : "na",
      photo_path: med.photoPath,
    }).select().single();
    if (error) throw error;
    return data;
  };
  const updateMedicine = async (medId, updates) => {
    const { data, error } = await supabase.from("medicines").update(updates).eq("id", medId).eq("user_id", userId).select().single();
    if (error) throw error;
    return data;
  };
  const getMedicinesForEpisode = async (episodeId) => {
    const { data, error } = await supabase.from("medicines").select("*").eq("episode_id", episodeId);
    if (error) throw error;
    return data;
  };
  const getActiveMedicines = async () => {
    const { data, error } = await supabase.from("medicines").select("*, episodes(syndrome_label)").eq("user_id", userId).eq("adherence_status", "taking");
    if (error) throw error;
    return data;
  };

  // ─── Adherence Logs ───
  const addAdherenceLog = async (medicineId, log) => {
    const { data, error } = await supabase.from("adherence_logs").insert({
      medicine_id: medicineId, user_id: userId,
      log_date: log.date, taken: log.taken,
      note: log.note, stop_reason: log.reason,
    }).select().single();
    if (error) throw error;
    return data;
  };
  const getAdherenceLogs = async (medicineId) => {
    const { data, error } = await supabase.from("adherence_logs").select("*").eq("medicine_id", medicineId).order("log_date");
    if (error) throw error;
    return data;
  };

  // ─── Photo Upload ───
  const uploadPhoto = async (file) => {
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("medicine-photos").upload(path, file);
    if (error) throw error;
    return data.path;
  };

  // ─── Data Export ───
  const exportAll = async () => {
    const [episodes, profile] = await Promise.all([getEpisodes(), getProfile()]);
    const enriched = await Promise.all(episodes.map(async ep => {
      const [meds, visits, logs] = await Promise.all([
        getMedicinesForEpisode(ep.id), getVisitsForEpisode(ep.id),
        supabase.from("daily_logs").select("*").eq("episode_id", ep.id).order("log_date").then(r => r.data),
      ]);
      const medsWithAdh = await Promise.all(meds.map(async m => {
        const adh = await getAdherenceLogs(m.id);
        return { ...m, adherence_logs: adh };
      }));
      return { ...ep, medicines: medsWithAdh, visits, daily_logs: logs };
    }));
    return { profile, episodes: enriched, exported_at: new Date().toISOString() };
  };

  return {
    getProfile, upsertProfile,
    getEpisodes, getActiveEpisodes, createEpisode, updateEpisode,
    addDailyLog,
    addVisit, getVisitsForEpisode,
    addMedicine, updateMedicine, getMedicinesForEpisode, getActiveMedicines,
    addAdherenceLog, getAdherenceLogs,
    uploadPhoto, exportAll,
  };
}
