use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use serde_json::Value;
use sqlx::{QueryBuilder, Row, Sqlite};
use std::collections::HashMap;

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::utils::*;
use crate::AppState;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExploreSubject {
    id: String,
    title: String,
    summary: Option<String>,
    content: String,
    parent_id: Option<String>,
    kind: String,
    status: String,
    bookmarked: bool,
    position: i64,
    prerequisites: Value,
    related: Value,
    references: Value,
    layers: Value,
    archived: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}

fn row_to_subject(r: &sqlx::sqlite::SqliteRow) -> Result<ExploreSubject, sqlx::Error> {
    Ok(ExploreSubject {
        id: r.try_get("id")?,
        title: r.try_get("title")?,
        summary: r.try_get::<Option<String>, _>("summary")?,
        content: r.try_get("content")?,
        parent_id: r.try_get("parentId")?,
        kind: r.try_get("kind")?,
        status: r.try_get("status")?,
        bookmarked: r.try_get::<i64, _>("bookmarked")? != 0,
        position: r.try_get("position")?,
        prerequisites: r.try_get::<String, _>("prerequisitesJson").ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(Value::Array(vec![])),
        related: r.try_get::<String, _>("relatedJson").ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(Value::Array(vec![])),
        references: r.try_get::<String, _>("referencesJson").ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(Value::Array(vec![])),
        layers: r.try_get::<String, _>("layersJson").ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(serde_json::json!({})),
        archived: r.try_get::<i64, _>("archived")? != 0,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
    })
}

/// GET /api/explore/subjects — non-archived by default; ?archived=true shows only archived ones.
pub async fn list_subjects(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<ExploreSubject>>, AppError> {
    let want_archived = matches!(params.get("archived").map(String::as_str), Some("true"));
    let rows = sqlx::query(
        "SELECT * FROM ExploreSubject WHERE archived = ? ORDER BY parentId IS NOT NULL, position ASC, title COLLATE NOCASE ASC",
    )
    .bind(if want_archived { 1_i64 } else { 0_i64 })
    .fetch_all(&st.db)
    .await?;

    let out = rows
        .iter()
        .map(row_to_subject)
        .collect::<Result<Vec<_>, sqlx::Error>>()?;
    Ok(Json(out))
}

pub async fn get_subject(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ExploreSubject>, AppError> {
    let row = sqlx::query("SELECT * FROM ExploreSubject WHERE id = ?")
        .bind(&id)
        .fetch_optional(&st.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Subject not found".to_string()))?;
    Ok(Json(row_to_subject(&row)?))
}

pub async fn create_subject(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<ExploreSubject>), AppError> {
    let title = body
        .get("title")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Title is required".to_string()))?
        .to_string();
    let summary = truthy_str(&body, "summary");
    let content = str_or(&body, "content", "");
    let parent_id = truthy_str(&body, "parentId");
    if let Some(parent) = &parent_id { let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ExploreSubject WHERE id = ? AND archived = 0").bind(parent).fetch_one(&st.db).await?; if exists == 0 { return Err(AppError::BadRequest("Parent subject does not exist".into())); } }
    let kind = str_or(&body, "kind", "subject");
    let status = str_or(&body, "status", "not-started");
    let bookmarked = body.get("bookmarked").and_then(Value::as_bool).unwrap_or(false);
    let position = body.get("position").and_then(Value::as_i64).unwrap_or(0);
    let prerequisites = body.get("prerequisites").map(Value::to_string).unwrap_or_else(|| "[]".into());
    let related = body.get("related").map(Value::to_string).unwrap_or_else(|| "[]".into());
    let references = body.get("references").map(Value::to_string).unwrap_or_else(|| "[]".into());
    let layers = body.get("layers").map(Value::to_string).unwrap_or_else(|| "{}".into());

    let id = gen_id();
    let now = now_ms();

    sqlx::query(
        "INSERT INTO ExploreSubject (id,title,summary,content,parentId,kind,status,bookmarked,position,prerequisitesJson,relatedJson,referencesJson,layersJson,archived,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)",
    )
    .bind(&id)
    .bind(&title)
    .bind(&summary)
    .bind(&content)
    .bind(&parent_id)
    .bind(&kind)
    .bind(&status)
    .bind(if bookmarked { 1_i64 } else { 0_i64 })
    .bind(position)
    .bind(prerequisites)
    .bind(related)
    .bind(references)
    .bind(layers)
    .bind(now)
    .bind(now)
    .execute(&st.db)
    .await?;

    let row = sqlx::query("SELECT * FROM ExploreSubject WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    Ok((StatusCode::CREATED, Json(row_to_subject(&row)?)))
}

pub async fn update_subject(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<ExploreSubject>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ExploreSubject WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Subject not found".to_string()));
    }

    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE ExploreSubject SET ");
    let mut first = true;

    if let Some(v) = body.get("title").and_then(|v| v.as_str()) {
        let trimmed = v.trim();
        if trimmed.is_empty() {
            return Err(AppError::BadRequest("Title cannot be empty".to_string()));
        }
        crate::push_set!(qb, first, "title = ", trimmed.to_string());
    }
    if let Some(v) = patch_str(&body, "summary") {
        crate::push_set!(qb, first, "summary = ", v);
    }
    if let Some(v) = body.get("content").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "content = ", v.to_string());
    }
    if let Some(v) = body.get("parentId") {
        let parent = v.as_str().filter(|s| !s.trim().is_empty()).map(str::to_string);
        if parent.as_deref() == Some(id.as_str()) { return Err(AppError::BadRequest("A subject cannot be its own parent".into())); }
        if let Some(parent_id) = &parent {
            let parent_exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ExploreSubject WHERE id = ? AND archived = 0").bind(parent_id).fetch_one(&st.db).await?;
            if parent_exists == 0 { return Err(AppError::BadRequest("Parent subject does not exist".into())); }
        }
        crate::push_set!(qb, first, "parentId = ", parent);
    }
    if let Some(v) = body.get("kind").and_then(Value::as_str) { crate::push_set!(qb, first, "kind = ", v.to_string()); }
    if let Some(v) = body.get("status").and_then(Value::as_str) { crate::push_set!(qb, first, "status = ", v.to_string()); }
    if let Some(v) = body.get("bookmarked").and_then(Value::as_bool) { crate::push_set!(qb, first, "bookmarked = ", if v { 1_i64 } else { 0_i64 }); }
    if let Some(v) = body.get("position").and_then(Value::as_i64) { crate::push_set!(qb, first, "position = ", v); }
    if let Some(v) = body.get("prerequisites") { crate::push_set!(qb, first, "prerequisitesJson = ", v.to_string()); }
    if let Some(v) = body.get("related") { crate::push_set!(qb, first, "relatedJson = ", v.to_string()); }
    if let Some(v) = body.get("references") { crate::push_set!(qb, first, "referencesJson = ", v.to_string()); }
    if let Some(v) = body.get("layers") { crate::push_set!(qb, first, "layersJson = ", v.to_string()); }
    if let Some(v) = patch_bool(&body, "archived") {
        crate::push_set!(qb, first, "archived = ", if v { 1_i64 } else { 0_i64 });
    }
    crate::push_set!(qb, first, "updatedAt = ", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;

    let row = sqlx::query("SELECT * FROM ExploreSubject WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    Ok(Json(row_to_subject(&row)?))
}

pub async fn delete_subject(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ExploreSubject WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Subject not found".to_string()));
    }
    sqlx::query("DELETE FROM ExploreSubject WHERE id = ?")
        .bind(&id)
        .execute(&st.db)
        .await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
