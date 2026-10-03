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
        "SELECT * FROM ExploreSubject WHERE archived = ? ORDER BY updatedAt DESC",
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

    let id = gen_id();
    let now = now_ms();

    sqlx::query(
        "INSERT INTO ExploreSubject (id, title, summary, content, archived, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, 0, ?, ?)",
    )
    .bind(&id)
    .bind(&title)
    .bind(&summary)
    .bind(&content)
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
