// Generated from TRACE canonical migrations by npm run db:types. Do not edit.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = { public: { Tables: {
  "ai_chat_sessions": {
    Row: {
      "id": string;
      "user_id": string;
      "started_at": string | null;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "started_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "started_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "ai_chat_sessions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "ai_citations": {
    Row: {
      "id": string;
      "message_id": string;
      "pubmed_id": string | null;
      "doi": string | null;
      "study_title": string;
      "authors": string | null;
      "excerpt": string;
    };
    Insert: {
      "id"?: string;
      "message_id": string;
      "pubmed_id"?: string | null;
      "doi"?: string | null;
      "study_title": string;
      "authors"?: string | null;
      "excerpt": string;
    };
    Update: {
      "id"?: string;
      "message_id"?: string;
      "pubmed_id"?: string | null;
      "doi"?: string | null;
      "study_title"?: string;
      "authors"?: string | null;
      "excerpt"?: string;
    };
    Relationships: [
      { foreignKeyName: "ai_citations_message_id_fkey"; columns: ["message_id"]; isOneToOne: false; referencedRelation: "ai_messages"; referencedColumns: ["id"] },
    ];
  };
  "ai_messages": {
    Row: {
      "id": string;
      "session_id": string;
      "sender": Database['public']['Enums']["chat_sender"];
      "content": string;
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "session_id": string;
      "sender": Database['public']['Enums']["chat_sender"];
      "content": string;
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "session_id"?: string;
      "sender"?: Database['public']['Enums']["chat_sender"];
      "content"?: string;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "ai_messages_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "ai_chat_sessions"; referencedColumns: ["id"] },
    ];
  };
  "bodyweight_logs": {
    Row: {
      "id": string;
      "user_id": string;
      "recorded_date": string;
      "weight_kg": number;
      "note": string | null;
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "recorded_date": string;
      "weight_kg": number;
      "note"?: string | null;
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "recorded_date"?: string;
      "weight_kg"?: number;
      "note"?: string | null;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "bodyweight_logs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "bodyweight_settings": {
    Row: {
      "user_id": string;
      "moving_average_window": number;
      "weigh_in_reminder_enabled": boolean;
      "weigh_in_reminder_time": string | null;
      "updated_at": string;
    };
    Insert: {
      "user_id": string;
      "moving_average_window"?: number;
      "weigh_in_reminder_enabled"?: boolean;
      "weigh_in_reminder_time"?: string | null;
      "updated_at"?: string;
    };
    Update: {
      "user_id"?: string;
      "moving_average_window"?: number;
      "weigh_in_reminder_enabled"?: boolean;
      "weigh_in_reminder_time"?: string | null;
      "updated_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "bodyweight_settings_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "cardio_entries": {
    Row: {
      "id": string;
      "user_id": string;
      "cardio_exercise_id": string;
      "entry_date": string;
      "duration_seconds": number;
      "created_at": string;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "cardio_exercise_id": string;
      "entry_date": string;
      "duration_seconds": number;
      "created_at"?: string;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "cardio_exercise_id"?: string;
      "entry_date"?: string;
      "duration_seconds"?: number;
      "created_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "cardio_entries_cardio_exercise_id_fkey"; columns: ["cardio_exercise_id"]; isOneToOne: false; referencedRelation: "cardio_exercises"; referencedColumns: ["id"] },
      { foreignKeyName: "cardio_entries_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "cardio_exercises": {
    Row: {
      "id": string;
      "user_id": string;
      "name": string;
      "created_at": string;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "name": string;
      "created_at"?: string;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "name"?: string;
      "created_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "cardio_exercises_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "check_in_templates": {
    Row: {
      "id": string;
      "coach_id": string;
      "name": string;
      "questions": Json;
      "created_at": string | null;
      "description": string | null;
      "schedule": Json;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "name": string;
      "questions"?: Json;
      "created_at"?: string | null;
      "description"?: string | null;
      "schedule"?: Json;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "name"?: string;
      "questions"?: Json;
      "created_at"?: string | null;
      "description"?: string | null;
      "schedule"?: Json;
    };
    Relationships: [
      { foreignKeyName: "check_in_templates_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "check_ins": {
    Row: {
      "id": string;
      "client_id": string;
      "coach_id": string;
      "template_id": string | null;
      "status": Database['public']['Enums']["check_in_status"];
      "scheduled_for": string;
      "submitted_at": string | null;
      "reviewed_at": string | null;
      "reviewed_by": string | null;
      "responses": Json;
      "coach_notes": string | null;
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "client_id": string;
      "coach_id": string;
      "template_id"?: string | null;
      "status"?: Database['public']['Enums']["check_in_status"];
      "scheduled_for": string;
      "submitted_at"?: string | null;
      "reviewed_at"?: string | null;
      "reviewed_by"?: string | null;
      "responses"?: Json;
      "coach_notes"?: string | null;
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "client_id"?: string;
      "coach_id"?: string;
      "template_id"?: string | null;
      "status"?: Database['public']['Enums']["check_in_status"];
      "scheduled_for"?: string;
      "submitted_at"?: string | null;
      "reviewed_at"?: string | null;
      "reviewed_by"?: string | null;
      "responses"?: Json;
      "coach_notes"?: string | null;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "check_ins_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "check_ins_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "check_ins_reviewed_by_fkey"; columns: ["reviewed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "check_ins_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "check_in_templates"; referencedColumns: ["id"] },
    ];
  };
  "client_invites": {
    Row: {
      "id": string;
      "coach_id": string;
      "screens_config": Json;
      "status": string;
      "created_at": string | null;
      "revoked_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "screens_config": Json;
      "status"?: string;
      "created_at"?: string | null;
      "revoked_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "screens_config"?: Json;
      "status"?: string;
      "created_at"?: string | null;
      "revoked_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "client_invites_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "client_tag_assignments": {
    Row: {
      "tag_id": string;
      "client_id": string;
      "created_at": string | null;
    };
    Insert: {
      "tag_id": string;
      "client_id": string;
      "created_at"?: string | null;
    };
    Update: {
      "tag_id"?: string;
      "client_id"?: string;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "client_tag_assignments_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "client_tag_assignments_tag_id_fkey"; columns: ["tag_id"]; isOneToOne: false; referencedRelation: "client_tags"; referencedColumns: ["id"] },
    ];
  };
  "client_tags": {
    Row: {
      "id": string;
      "coach_id": string;
      "name": string;
      "color": string;
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "name": string;
      "color": string;
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "name"?: string;
      "color"?: string;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "client_tags_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "coach_allowlist": {
    Row: {
      "email": string;
      "invited_by": string | null;
      "note": string | null;
      "created_at": string | null;
    };
    Insert: {
      "email": string;
      "invited_by"?: string | null;
      "note"?: string | null;
      "created_at"?: string | null;
    };
    Update: {
      "email"?: string;
      "invited_by"?: string | null;
      "note"?: string | null;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "coach_allowlist_invited_by_fkey"; columns: ["invited_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "coach_extensions": {
    Row: {
      "coach_id": string;
      "business_name": string;
      "certifications": (string)[];
      "biography": string | null;
      "specialties": (string)[];
      "is_public": boolean | null;
      "slots_total": number | null;
      "updated_at": string | null;
    };
    Insert: {
      "coach_id": string;
      "business_name": string;
      "certifications"?: (string)[];
      "biography"?: string | null;
      "specialties"?: (string)[];
      "is_public"?: boolean | null;
      "slots_total"?: number | null;
      "updated_at"?: string | null;
    };
    Update: {
      "coach_id"?: string;
      "business_name"?: string;
      "certifications"?: (string)[];
      "biography"?: string | null;
      "specialties"?: (string)[];
      "is_public"?: boolean | null;
      "slots_total"?: number | null;
      "updated_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "coach_extensions_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "coach_trainee_relations": {
    Row: {
      "id": string;
      "coach_id": string;
      "trainee_id": string;
      "status": Database['public']['Enums']["relation_status"];
      "linked_at": string | null;
      "updated_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "trainee_id": string;
      "status"?: Database['public']['Enums']["relation_status"];
      "linked_at"?: string | null;
      "updated_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "trainee_id"?: string;
      "status"?: Database['public']['Enums']["relation_status"];
      "linked_at"?: string | null;
      "updated_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "coach_trainee_relations_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "coach_trainee_relations_trainee_id_fkey"; columns: ["trainee_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "custom_foods": {
    Row: {
      "id": string;
      "user_id": string;
      "name": string;
      "protein_g": number | null;
      "carbs_g": number | null;
      "fat_g": number | null;
      "calories": number | null;
      "created_at": string;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "name": string;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "calories"?: number | null;
      "created_at"?: string;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "name"?: string;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "calories"?: number | null;
      "created_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "custom_foods_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "direct_messages": {
    Row: {
      "id": string;
      "sender_id": string;
      "recipient_id": string;
      "content": string;
      "created_at": string | null;
      "read_at": string | null;
    };
    Insert: {
      "id"?: string;
      "sender_id": string;
      "recipient_id": string;
      "content": string;
      "created_at"?: string | null;
      "read_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "sender_id"?: string;
      "recipient_id"?: string;
      "content"?: string;
      "created_at"?: string | null;
      "read_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "direct_messages_recipient_id_fkey"; columns: ["recipient_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "direct_messages_sender_id_fkey"; columns: ["sender_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "equipment": {
    Row: {
      "id": string;
      "coach_id": string;
      "name": string;
      "category": string | null;
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "name": string;
      "category"?: string | null;
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "name"?: string;
      "category"?: string | null;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "equipment_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "exercise_muscles": {
    Row: {
      "exercise_id": string;
      "muscle_group_id": string;
      "role": Database['public']['Enums']["muscle_role"];
    };
    Insert: {
      "exercise_id": string;
      "muscle_group_id": string;
      "role": Database['public']['Enums']["muscle_role"];
    };
    Update: {
      "exercise_id"?: string;
      "muscle_group_id"?: string;
      "role"?: Database['public']['Enums']["muscle_role"];
    };
    Relationships: [
      { foreignKeyName: "exercise_muscles_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] },
      { foreignKeyName: "exercise_muscles_muscle_group_id_fkey"; columns: ["muscle_group_id"]; isOneToOne: false; referencedRelation: "muscle_groups"; referencedColumns: ["id"] },
    ];
  };
  "exercises": {
    Row: {
      "id": string;
      "name": string;
      "target_muscle_group": string | null;
      "equipment_type": string | null;
      "is_custom": boolean | null;
      "created_by_coach_id": string | null;
      "reference_video_url": string | null;
      "category": string | null;
      "description": string | null;
      "exercise_type": Database['public']['Enums']["exercise_type"];
      "movement_profile": string | null;
      "exercise_position": string | null;
      "is_bodyweight": boolean;
      "is_unilateral": boolean;
      "coaching_cues": (string)[];
      "equipment_tags": (string)[];
      "created_at": string;
    };
    Insert: {
      "id"?: string;
      "name": string;
      "target_muscle_group"?: string | null;
      "equipment_type"?: string | null;
      "is_custom"?: boolean | null;
      "created_by_coach_id"?: string | null;
      "reference_video_url"?: string | null;
      "category"?: string | null;
      "description"?: string | null;
      "exercise_type"?: Database['public']['Enums']["exercise_type"];
      "movement_profile"?: string | null;
      "exercise_position"?: string | null;
      "is_bodyweight"?: boolean;
      "is_unilateral"?: boolean;
      "coaching_cues"?: (string)[];
      "equipment_tags"?: (string)[];
      "created_at"?: string;
    };
    Update: {
      "id"?: string;
      "name"?: string;
      "target_muscle_group"?: string | null;
      "equipment_type"?: string | null;
      "is_custom"?: boolean | null;
      "created_by_coach_id"?: string | null;
      "reference_video_url"?: string | null;
      "category"?: string | null;
      "description"?: string | null;
      "exercise_type"?: Database['public']['Enums']["exercise_type"];
      "movement_profile"?: string | null;
      "exercise_position"?: string | null;
      "is_bodyweight"?: boolean;
      "is_unilateral"?: boolean;
      "coaching_cues"?: (string)[];
      "equipment_tags"?: (string)[];
      "created_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "exercises_created_by_coach_id_fkey"; columns: ["created_by_coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "favorite_foods": {
    Row: {
      "id": string;
      "user_id": string;
      "name": string;
      "protein_g": number | null;
      "carbs_g": number | null;
      "fat_g": number | null;
      "calories": number | null;
      "created_at": string;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "name": string;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "calories"?: number | null;
      "created_at"?: string;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "name"?: string;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "calories"?: number | null;
      "created_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "favorite_foods_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "follows": {
    Row: {
      "follower_id": string;
      "followee_id": string;
      "created_at": string;
    };
    Insert: {
      "follower_id": string;
      "followee_id": string;
      "created_at"?: string;
    };
    Update: {
      "follower_id"?: string;
      "followee_id"?: string;
      "created_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "follows_followee_id_fkey"; columns: ["followee_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "follows_follower_id_fkey"; columns: ["follower_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "foods": {
    Row: {
      "id": string;
      "coach_id": string;
      "name": string;
      "serving_size": string | null;
      "calories": number | null;
      "protein_g": number | null;
      "carbs_g": number | null;
      "fat_g": number | null;
      "recipe": string | null;
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "name": string;
      "serving_size"?: string | null;
      "calories"?: number | null;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "recipe"?: string | null;
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "name"?: string;
      "serving_size"?: string | null;
      "calories"?: number | null;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "recipe"?: string | null;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "foods_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "form_checks": {
    Row: {
      "id": string;
      "client_id": string;
      "coach_id": string | null;
      "exercise_id": string | null;
      "video_key": string | null;
      "status": string;
      "coach_notes": string | null;
      "submitted_at": string | null;
      "reviewed_at": string | null;
    };
    Insert: {
      "id"?: string;
      "client_id": string;
      "coach_id"?: string | null;
      "exercise_id"?: string | null;
      "video_key"?: string | null;
      "status"?: string;
      "coach_notes"?: string | null;
      "submitted_at"?: string | null;
      "reviewed_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "client_id"?: string;
      "coach_id"?: string | null;
      "exercise_id"?: string | null;
      "video_key"?: string | null;
      "status"?: string;
      "coach_notes"?: string | null;
      "submitted_at"?: string | null;
      "reviewed_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "form_checks_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "form_checks_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "form_checks_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] },
    ];
  };
  "landing_pages": {
    Row: {
      "id": string;
      "coach_id": string;
      "slug": string;
      "layout_config": Json;
      "is_published": boolean | null;
      "created_at": string | null;
      "updated_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "slug": string;
      "layout_config"?: Json;
      "is_published"?: boolean | null;
      "created_at"?: string | null;
      "updated_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "slug"?: string;
      "layout_config"?: Json;
      "is_published"?: boolean | null;
      "created_at"?: string | null;
      "updated_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "landing_pages_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "meal_plans": {
    Row: {
      "id": string;
      "coach_id": string;
      "client_id": string | null;
      "name": string;
      "data": Json;
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "client_id"?: string | null;
      "name"?: string;
      "data"?: Json;
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "client_id"?: string | null;
      "name"?: string;
      "data"?: Json;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "meal_plans_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "meal_plans_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "meal_template_items": {
    Row: {
      "id": string;
      "meal_template_id": string;
      "order": number;
      "name": string;
      "protein_g": number | null;
      "carbs_g": number | null;
      "fat_g": number | null;
      "calories": number | null;
    };
    Insert: {
      "id"?: string;
      "meal_template_id": string;
      "order"?: number;
      "name": string;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "calories"?: number | null;
    };
    Update: {
      "id"?: string;
      "meal_template_id"?: string;
      "order"?: number;
      "name"?: string;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "calories"?: number | null;
    };
    Relationships: [
      { foreignKeyName: "meal_template_items_meal_template_id_fkey"; columns: ["meal_template_id"]; isOneToOne: false; referencedRelation: "meal_templates"; referencedColumns: ["id"] },
    ];
  };
  "meal_templates": {
    Row: {
      "id": string;
      "user_id": string;
      "name": string;
      "created_at": string;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "name": string;
      "created_at"?: string;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "name"?: string;
      "created_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "meal_templates_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "meals": {
    Row: {
      "id": string;
      "coach_id": string;
      "client_id": string | null;
      "category": string | null;
      "label": string | null;
      "consumed_at": string | null;
      "notes": string | null;
      "food_ids": (string)[];
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "client_id"?: string | null;
      "category"?: string | null;
      "label"?: string | null;
      "consumed_at"?: string | null;
      "notes"?: string | null;
      "food_ids"?: (string)[];
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "client_id"?: string | null;
      "category"?: string | null;
      "label"?: string | null;
      "consumed_at"?: string | null;
      "notes"?: string | null;
      "food_ids"?: (string)[];
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "meals_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "meals_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "muscle_groups": {
    Row: {
      "id": string;
      "name": string;
    };
    Insert: {
      "id"?: string;
      "name": string;
    };
    Update: {
      "id"?: string;
      "name"?: string;
    };
    Relationships: [
    ];
  };
  "notification_settings": {
    Row: {
      "user_id": string;
      "quiet_hours_enabled": boolean;
      "quiet_hours_start": string | null;
      "quiet_hours_end": string | null;
      "mute_personal": boolean;
      "mute_coaching": boolean;
      "updated_at": string;
    };
    Insert: {
      "user_id": string;
      "quiet_hours_enabled"?: boolean;
      "quiet_hours_start"?: string | null;
      "quiet_hours_end"?: string | null;
      "mute_personal"?: boolean;
      "mute_coaching"?: boolean;
      "updated_at"?: string;
    };
    Update: {
      "user_id"?: string;
      "quiet_hours_enabled"?: boolean;
      "quiet_hours_start"?: string | null;
      "quiet_hours_end"?: string | null;
      "mute_personal"?: boolean;
      "mute_coaching"?: boolean;
      "updated_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "notification_settings_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "notifications": {
    Row: {
      "id": string;
      "coach_id": string;
      "title": string;
      "body": string | null;
      "read": boolean;
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "title": string;
      "body"?: string | null;
      "read"?: boolean;
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "title"?: string;
      "body"?: string | null;
      "read"?: boolean;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "notifications_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "nutrition_logs": {
    Row: {
      "id": string;
      "user_id": string;
      "logged_at": string | null;
      "method": Database['public']['Enums']["nutrition_entry_method"];
      "description": string | null;
      "protein_g": number | null;
      "carbs_g": number | null;
      "fat_g": number | null;
      "calories": number | null;
      "photo_s3_key": string | null;
      "fiber_g": number | null;
      "sugar_g": number | null;
      "meal_slot": number | null;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "logged_at"?: string | null;
      "method"?: Database['public']['Enums']["nutrition_entry_method"];
      "description"?: string | null;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "calories"?: number | null;
      "photo_s3_key"?: string | null;
      "fiber_g"?: number | null;
      "sugar_g"?: number | null;
      "meal_slot"?: number | null;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "logged_at"?: string | null;
      "method"?: Database['public']['Enums']["nutrition_entry_method"];
      "description"?: string | null;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "calories"?: number | null;
      "photo_s3_key"?: string | null;
      "fiber_g"?: number | null;
      "sugar_g"?: number | null;
      "meal_slot"?: number | null;
    };
    Relationships: [
      { foreignKeyName: "nutrition_logs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "onboarding_responses": {
    Row: {
      "id": string;
      "trainee_id": string;
      "coach_id": string;
      "answers": Json;
      "submitted_at": string | null;
    };
    Insert: {
      "id"?: string;
      "trainee_id": string;
      "coach_id": string;
      "answers"?: Json;
      "submitted_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "trainee_id"?: string;
      "coach_id"?: string;
      "answers"?: Json;
      "submitted_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "onboarding_responses_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "onboarding_responses_trainee_id_fkey"; columns: ["trainee_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "platform_settings": {
    Row: {
      "key": string;
      "value": string;
      "updated_at": string | null;
    };
    Insert: {
      "key": string;
      "value": string;
      "updated_at"?: string | null;
    };
    Update: {
      "key"?: string;
      "value"?: string;
      "updated_at"?: string | null;
    };
    Relationships: [
    ];
  };
  "profiles": {
    Row: {
      "id": string;
      "email": string;
      "role": Database['public']['Enums']["user_role"];
      "coach_id": string | null;
      "first_name": string;
      "last_name": string;
      "dob": string | null;
      "experience_level": Database['public']['Enums']["experience_tier"] | null;
      "primary_goal": string | null;
      "injury_notes": string | null;
      "wearable_sync_active": boolean | null;
      "premium_status": boolean | null;
      "created_at": string | null;
      "updated_at": string | null;
      "expo_push_token": string | null;
      "is_platform_admin": boolean;
      "manually_marked_churned": boolean;
      "coach_code": string | null;
      "bio": string | null;
      "height_cm": number | null;
      "biological_sex": string | null;
      "phone": string | null;
      "username": string | null;
      "avatar_key": string | null;
    };
    Insert: {
      "id": string;
      "email": string;
      "role"?: Database['public']['Enums']["user_role"];
      "coach_id"?: string | null;
      "first_name": string;
      "last_name": string;
      "dob"?: string | null;
      "experience_level"?: Database['public']['Enums']["experience_tier"] | null;
      "primary_goal"?: string | null;
      "injury_notes"?: string | null;
      "wearable_sync_active"?: boolean | null;
      "premium_status"?: boolean | null;
      "created_at"?: string | null;
      "updated_at"?: string | null;
      "expo_push_token"?: string | null;
      "is_platform_admin"?: boolean;
      "manually_marked_churned"?: boolean;
      "coach_code"?: string | null;
      "bio"?: string | null;
      "height_cm"?: number | null;
      "biological_sex"?: string | null;
      "phone"?: string | null;
      "username"?: string | null;
      "avatar_key"?: string | null;
    };
    Update: {
      "id"?: string;
      "email"?: string;
      "role"?: Database['public']['Enums']["user_role"];
      "coach_id"?: string | null;
      "first_name"?: string;
      "last_name"?: string;
      "dob"?: string | null;
      "experience_level"?: Database['public']['Enums']["experience_tier"] | null;
      "primary_goal"?: string | null;
      "injury_notes"?: string | null;
      "wearable_sync_active"?: boolean | null;
      "premium_status"?: boolean | null;
      "created_at"?: string | null;
      "updated_at"?: string | null;
      "expo_push_token"?: string | null;
      "is_platform_admin"?: boolean;
      "manually_marked_churned"?: boolean;
      "coach_code"?: string | null;
      "bio"?: string | null;
      "height_cm"?: number | null;
      "biological_sex"?: string | null;
      "phone"?: string | null;
      "username"?: string | null;
      "avatar_key"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "profiles_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "program_days": {
    Row: {
      "id": string;
      "program_id": string;
      "week_number": number;
      "day_of_week": number;
      "workout_template_id": string | null;
      "notes": string | null;
    };
    Insert: {
      "id"?: string;
      "program_id": string;
      "week_number": number;
      "day_of_week": number;
      "workout_template_id"?: string | null;
      "notes"?: string | null;
    };
    Update: {
      "id"?: string;
      "program_id"?: string;
      "week_number"?: number;
      "day_of_week"?: number;
      "workout_template_id"?: string | null;
      "notes"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "program_days_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "workout_programs"; referencedColumns: ["id"] },
      { foreignKeyName: "program_days_workout_template_id_fkey"; columns: ["workout_template_id"]; isOneToOne: false; referencedRelation: "workout_templates"; referencedColumns: ["id"] },
    ];
  };
  "program_enrollments": {
    Row: {
      "id": string;
      "program_id": string;
      "user_id": string;
      "started_at": string;
      "completed_at": string | null;
      "current_week": number;
      "current_day": number;
    };
    Insert: {
      "id"?: string;
      "program_id": string;
      "user_id": string;
      "started_at"?: string;
      "completed_at"?: string | null;
      "current_week"?: number;
      "current_day"?: number;
    };
    Update: {
      "id"?: string;
      "program_id"?: string;
      "user_id"?: string;
      "started_at"?: string;
      "completed_at"?: string | null;
      "current_week"?: number;
      "current_day"?: number;
    };
    Relationships: [
      { foreignKeyName: "program_enrollments_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "workout_programs"; referencedColumns: ["id"] },
      { foreignKeyName: "program_enrollments_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "programs": {
    Row: {
      "id": string;
      "coach_id": string;
      "name": string;
      "description": string | null;
      "category": string | null;
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "name": string;
      "description"?: string | null;
      "category"?: string | null;
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "name"?: string;
      "description"?: string | null;
      "category"?: string | null;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "programs_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "progress_photos": {
    Row: {
      "id": string;
      "user_id": string;
      "taken_date": string;
      "photo_s3_key": string;
      "note": string | null;
      "created_at": string;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "taken_date": string;
      "photo_s3_key": string;
      "note"?: string | null;
      "created_at"?: string;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "taken_date"?: string;
      "photo_s3_key"?: string;
      "note"?: string | null;
      "created_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "progress_photos_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "roadmaps": {
    Row: {
      "id": string;
      "coach_id": string;
      "client_id": string | null;
      "title": string;
      "description": string | null;
      "status": string;
      "start_date": string | null;
      "target_end_date": string | null;
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "client_id"?: string | null;
      "title": string;
      "description"?: string | null;
      "status"?: string;
      "start_date"?: string | null;
      "target_end_date"?: string | null;
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "client_id"?: string | null;
      "title"?: string;
      "description"?: string | null;
      "status"?: string;
      "start_date"?: string | null;
      "target_end_date"?: string | null;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "roadmaps_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "roadmaps_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "set_logs": {
    Row: {
      "id": string;
      "session_id": string;
      "exercise_id": string;
      "set_number": number;
      "weight_kg": number;
      "reps": number;
      "rpe": number | null;
      "estimated_1rm": number | null;
      "is_completed": boolean | null;
      "form_video_s3_key": string | null;
      "is_warmup": boolean;
      "is_failure": boolean;
      "set_type": string;
      "duration_seconds": number | null;
    };
    Insert: {
      "id"?: string;
      "session_id": string;
      "exercise_id": string;
      "set_number": number;
      "weight_kg": number;
      "reps": number;
      "rpe"?: number | null;
      "estimated_1rm"?: never;
      "is_completed"?: boolean | null;
      "form_video_s3_key"?: string | null;
      "is_warmup"?: boolean;
      "is_failure"?: boolean;
      "set_type"?: string;
      "duration_seconds"?: number | null;
    };
    Update: {
      "id"?: string;
      "session_id"?: string;
      "exercise_id"?: string;
      "set_number"?: number;
      "weight_kg"?: number;
      "reps"?: number;
      "rpe"?: number | null;
      "estimated_1rm"?: never;
      "is_completed"?: boolean | null;
      "form_video_s3_key"?: string | null;
      "is_warmup"?: boolean;
      "is_failure"?: boolean;
      "set_type"?: string;
      "duration_seconds"?: number | null;
    };
    Relationships: [
      { foreignKeyName: "set_logs_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] },
      { foreignKeyName: "set_logs_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "workout_sessions"; referencedColumns: ["id"] },
    ];
  };
  "sleep_logs": {
    Row: {
      "id": string;
      "user_id": string;
      "sleep_date": string;
      "bedtime": string;
      "wake_time": string;
      "quality": number;
      "created_at": string;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "sleep_date": string;
      "bedtime": string;
      "wake_time": string;
      "quality": number;
      "created_at"?: string;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "sleep_date"?: string;
      "bedtime"?: string;
      "wake_time"?: string;
      "quality"?: number;
      "created_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "sleep_logs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "supplements": {
    Row: {
      "id": string;
      "name": string;
      "protein_g": number | null;
      "carbs_g": number | null;
      "fat_g": number | null;
      "calories": number | null;
      "created_at": string;
    };
    Insert: {
      "id"?: string;
      "name": string;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "calories"?: number | null;
      "created_at"?: string;
    };
    Update: {
      "id"?: string;
      "name"?: string;
      "protein_g"?: number | null;
      "carbs_g"?: number | null;
      "fat_g"?: number | null;
      "calories"?: number | null;
      "created_at"?: string;
    };
    Relationships: [
    ];
  };
  "template_items": {
    Row: {
      "id": string;
      "template_id": string;
      "exercise_id": string;
      "position": number;
      "target_sets": number;
      "target_reps": number;
      "target_rpe": number | null;
      "rest_seconds": number;
    };
    Insert: {
      "id"?: string;
      "template_id": string;
      "exercise_id": string;
      "position": number;
      "target_sets"?: number;
      "target_reps"?: number;
      "target_rpe"?: number | null;
      "rest_seconds"?: number;
    };
    Update: {
      "id"?: string;
      "template_id"?: string;
      "exercise_id"?: string;
      "position"?: number;
      "target_sets"?: number;
      "target_reps"?: number;
      "target_rpe"?: number | null;
      "rest_seconds"?: number;
    };
    Relationships: [
      { foreignKeyName: "template_items_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] },
      { foreignKeyName: "template_items_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "workout_templates"; referencedColumns: ["id"] },
    ];
  };
  "training_group_members": {
    Row: {
      "group_id": string;
      "client_id": string;
      "added_at": string | null;
    };
    Insert: {
      "group_id": string;
      "client_id": string;
      "added_at"?: string | null;
    };
    Update: {
      "group_id"?: string;
      "client_id"?: string;
      "added_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "training_group_members_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "training_group_members_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "training_groups"; referencedColumns: ["id"] },
    ];
  };
  "training_groups": {
    Row: {
      "id": string;
      "coach_id": string;
      "name": string;
      "description": string | null;
      "program_id": string | null;
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "name": string;
      "description"?: string | null;
      "program_id"?: string | null;
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "name"?: string;
      "description"?: string | null;
      "program_id"?: string | null;
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "training_groups_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "training_groups_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "programs"; referencedColumns: ["id"] },
    ];
  };
  "training_phases": {
    Row: {
      "id": string;
      "user_id": string;
      "name": string;
      "start_date": string;
      "target_date": string | null;
      "target_metric": string | null;
      "target_value": number | null;
      "notes": string | null;
      "created_at": string;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "name": string;
      "start_date": string;
      "target_date"?: string | null;
      "target_metric"?: string | null;
      "target_value"?: number | null;
      "notes"?: string | null;
      "created_at"?: string;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "name"?: string;
      "start_date"?: string;
      "target_date"?: string | null;
      "target_metric"?: string | null;
      "target_value"?: number | null;
      "notes"?: string | null;
      "created_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "training_phases_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "vault_folders": {
    Row: {
      "id": string;
      "coach_id": string;
      "name": string;
      "description": string | null;
      "visibility": string;
      "client_ids": (string)[];
      "created_at": string | null;
    };
    Insert: {
      "id"?: string;
      "coach_id": string;
      "name": string;
      "description"?: string | null;
      "visibility"?: string;
      "client_ids"?: (string)[];
      "created_at"?: string | null;
    };
    Update: {
      "id"?: string;
      "coach_id"?: string;
      "name"?: string;
      "description"?: string | null;
      "visibility"?: string;
      "client_ids"?: (string)[];
      "created_at"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "vault_folders_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "water_logs": {
    Row: {
      "id": string;
      "user_id": string;
      "logged_date": string;
      "amount_ml": number;
      "updated_at": string;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "logged_date": string;
      "amount_ml": number;
      "updated_at"?: string;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "logged_date"?: string;
      "amount_ml"?: number;
      "updated_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "water_logs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "wearable_biometrics": {
    Row: {
      "id": string;
      "user_id": string;
      "recorded_date": string;
      "hrv_ms": number | null;
      "resting_heart_rate": number | null;
      "sleep_score": number | null;
      "active_calories_burned": number | null;
      "readiness_score": number | null;
      "synced_at": string | null;
      "step_count": number | null;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "recorded_date": string;
      "hrv_ms"?: number | null;
      "resting_heart_rate"?: number | null;
      "sleep_score"?: number | null;
      "active_calories_burned"?: number | null;
      "readiness_score"?: number | null;
      "synced_at"?: string | null;
      "step_count"?: number | null;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "recorded_date"?: string;
      "hrv_ms"?: number | null;
      "resting_heart_rate"?: number | null;
      "sleep_score"?: number | null;
      "active_calories_burned"?: number | null;
      "readiness_score"?: number | null;
      "synced_at"?: string | null;
      "step_count"?: number | null;
    };
    Relationships: [
      { foreignKeyName: "wearable_biometrics_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "workout_folders": {
    Row: {
      "id": string;
      "user_id": string;
      "name": string;
      "created_at": string;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "name": string;
      "created_at"?: string;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "name"?: string;
      "created_at"?: string;
    };
    Relationships: [
      { foreignKeyName: "workout_folders_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "workout_programs": {
    Row: {
      "id": string;
      "owner_id": string;
      "name": string;
      "description": string | null;
      "category": string | null;
      "split_type": string;
      "total_weeks": number;
      "created_at": string;
      "share_token": string | null;
    };
    Insert: {
      "id"?: string;
      "owner_id": string;
      "name": string;
      "description"?: string | null;
      "category"?: string | null;
      "split_type"?: string;
      "total_weeks": number;
      "created_at"?: string;
      "share_token"?: string | null;
    };
    Update: {
      "id"?: string;
      "owner_id"?: string;
      "name"?: string;
      "description"?: string | null;
      "category"?: string | null;
      "split_type"?: string;
      "total_weeks"?: number;
      "created_at"?: string;
      "share_token"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "workout_programs_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "workout_sessions": {
    Row: {
      "id": string;
      "user_id": string;
      "template_id": string | null;
      "session_name": string;
      "completed_at": string | null;
      "duration_seconds": number;
      "rpe_average": number | null;
      "compliance_score": number | null;
      "coach_feedback_notes": string | null;
      "session_type": string;
    };
    Insert: {
      "id"?: string;
      "user_id": string;
      "template_id"?: string | null;
      "session_name": string;
      "completed_at"?: string | null;
      "duration_seconds": number;
      "rpe_average"?: number | null;
      "compliance_score"?: number | null;
      "coach_feedback_notes"?: string | null;
      "session_type"?: string;
    };
    Update: {
      "id"?: string;
      "user_id"?: string;
      "template_id"?: string | null;
      "session_name"?: string;
      "completed_at"?: string | null;
      "duration_seconds"?: number;
      "rpe_average"?: number | null;
      "compliance_score"?: number | null;
      "coach_feedback_notes"?: string | null;
      "session_type"?: string;
    };
    Relationships: [
      { foreignKeyName: "workout_sessions_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "workout_templates"; referencedColumns: ["id"] },
      { foreignKeyName: "workout_sessions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
    ];
  };
  "workout_templates": {
    Row: {
      "id": string;
      "creator_id": string;
      "name": string;
      "description": string | null;
      "week_number": number | null;
      "day_number": number | null;
      "is_active": boolean | null;
      "created_at": string | null;
      "scope": Database['public']['Enums']["template_scope"];
      "assigned_trainee_id": string | null;
      "folder_id": string | null;
    };
    Insert: {
      "id"?: string;
      "creator_id": string;
      "name": string;
      "description"?: string | null;
      "week_number"?: number | null;
      "day_number"?: number | null;
      "is_active"?: boolean | null;
      "created_at"?: string | null;
      "scope"?: Database['public']['Enums']["template_scope"];
      "assigned_trainee_id"?: string | null;
      "folder_id"?: string | null;
    };
    Update: {
      "id"?: string;
      "creator_id"?: string;
      "name"?: string;
      "description"?: string | null;
      "week_number"?: number | null;
      "day_number"?: number | null;
      "is_active"?: boolean | null;
      "created_at"?: string | null;
      "scope"?: Database['public']['Enums']["template_scope"];
      "assigned_trainee_id"?: string | null;
      "folder_id"?: string | null;
    };
    Relationships: [
      { foreignKeyName: "workout_templates_assigned_trainee_id_fkey"; columns: ["assigned_trainee_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "workout_templates_creator_id_fkey"; columns: ["creator_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      { foreignKeyName: "workout_templates_folder_id_fkey"; columns: ["folder_id"]; isOneToOne: false; referencedRelation: "workout_folders"; referencedColumns: ["id"] },
    ];
  };
}; Views: { [_ in never]: never }; Functions: {
  "claim_coach_by_code": { Args: { "p_code": string }; Returns: undefined };
  "claim_coach_by_id": { Args: { "p_coach_id": string }; Returns: undefined };
  "generate_coach_code": { Args: Record<string, never>; Returns: string };
  "get_coach_cardio_summary": { Args: { "p_coach_id": string; "p_days"?: number }; Returns: { "client_id": string; "client_name": string; "cardio_sessions": number; "cardio_minutes": number }[] };
  "get_coach_dashboard_stats": { Args: { "p_coach_id": string }; Returns: { "new_signups_7d": number; "workouts_7d": number; "churned_count": number }[] };
  "get_coach_nutrition_summary": { Args: { "p_coach_id": string; "p_days"?: number }; Returns: { "client_id": string; "client_name": string; "log_count": number; "avg_calories": number }[] };
  "get_coach_roster_telemetry": { Args: { "p_coach_id": string }; Returns: { "trainee_id": string; "first_name": string; "last_name": string; "experience_level": Database['public']['Enums']["experience_tier"]; "total_sessions": number; "latest_hrv": number; "latest_sleep_score": number; "latest_readiness_score": number; "latest_biometric_date": string }[] };
  "get_coach_slot_count": { Args: { "p_coach_id": string }; Returns: number };
  "get_coach_steps_summary": { Args: { "p_coach_id": string; "p_days"?: number }; Returns: { "client_id": string; "client_name": string; "avg_daily_steps": number; "days_logged": number }[] };
  "get_coach_weekly_wins": { Args: { "p_coach_id": string }; Returns: { "client_id": string; "client_name": string; "exercise_name": string; "weight_kg": number; "reps": number; "estimated_1rm": number; "achieved_at": string }[] };
  "get_exercise_leaderboard": { Args: { "p_exercise_id": string }; Returns: { "user_id": string; "display_name": string; "weight_lbs": number; "reps": number; "rpe": number; "volume": number; "sets": number }[] };
  "get_exercise_stats": { Args: { "p_user_id": string; "p_exercise_id": string; "p_days"?: number }; Returns: { "session_date": string; "total_volume_kg": number; "top_weight_kg": number; "top_estimated_1rm": number; "total_sets": number }[] };
  "get_invite_link": { Args: { "p_invite_id": string }; Returns: { "coach_id": string; "coach_first_name": string; "screens_config": Json }[] };
  "get_muscle_analytics": { Args: { "p_user_id": string; "p_days"?: number }; Returns: { "target_muscle_group": string; "total_volume_kg": number; "total_sets": number }[] };
  "get_personal_records": { Args: { "p_user_id": string }; Returns: { "exercise_id": string; "exercise_name": string; "target_muscle_group": string; "best_estimated_1rm": number; "best_weight_kg": number; "best_reps": number; "achieved_at": string }[] };
  "is_coach": { Args: { "uid": string }; Returns: boolean };
  "join_program_by_token": { Args: { "p_token": string }; Returns: string };
  "list_available_coaches": { Args: Record<string, never>; Returns: { "id": string; "first_name": string; "last_name": string; "coach_code": string }[] };
  "list_coach_roster": { Args: Record<string, never>; Returns: { "id": string; "display_name": string }[] };
  "revoke_invite_link": { Args: { "p_coach_id": string }; Returns: undefined };
  "rotate_invite_link": { Args: { "p_coach_id": string; "p_screens_config": Json }; Returns: string };
  "set_client_churned": { Args: { "p_client_id": string; "p_churned": boolean }; Returns: undefined };
  "sync_workout_session": { Args: { "p_session": Json }; Returns: string };
}; Enums: {
  "chat_sender": "USER" | "ASSISTANT";
  "check_in_status": "scheduled" | "submitted" | "reviewed";
  "exercise_type": "regular" | "isometric_yielding" | "isometric_overcoming";
  "experience_tier": "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  "muscle_role": "primary" | "secondary";
  "nutrition_entry_method": "TYPED" | "BARCODE" | "PHOTO";
  "relation_status": "ACTIVE" | "PAUSED" | "TERMINATED";
  "template_scope": "PUBLIC" | "PRIVATE" | "ASSIGNED";
  "user_role": "coach" | "trainee";
}; CompositeTypes: { [_ in never]: never }; } };
