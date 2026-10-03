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
pub(crate) struct StudioItem {
    id: String,
    title: String,
    kind: String,
    summary: Option<String>,
    content: String,
    archived: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}

fn row_to_item(r: &sqlx::sqlite::SqliteRow) -> Result<StudioItem, sqlx::Error> {
    Ok(StudioItem {
        id: r.try_get("id")?,
        title: r.try_get("title")?,
        kind: r.try_get("kind")?,
        summary: r.try_get::<Option<String>, _>("summary")?,
        content: r.try_get("content")?,
        archived: r.try_get::<i64, _>("archived")? != 0,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
    })
}

/// GET /api/studio/items — non-archived by default; ?archived=true for archived ones;
/// optional ?kind=... filters to one kind.
pub async fn list_items(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<StudioItem>>, AppError> {
    let want_archived = matches!(params.get("archived").map(String::as_str), Some("true"));
    let mut qb: QueryBuilder<Sqlite> =
        QueryBuilder::new("SELECT * FROM StudioItem WHERE archived = ");
    qb.push_bind(if want_archived { 1_i64 } else { 0_i64 });
    if let Some(kind) = params.get("kind") {
        qb.push(" AND kind = ").push_bind(kind.clone());
    }
    qb.push(" ORDER BY updatedAt DESC");

    let rows = qb.build().fetch_all(&st.db).await?;
    let out = rows
        .iter()
        .map(row_to_item)
        .collect::<Result<Vec<_>, sqlx::Error>>()?;
    Ok(Json(out))
}

pub async fn get_item(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<StudioItem>, AppError> {
    let row = sqlx::query("SELECT * FROM StudioItem WHERE id = ?")
        .bind(&id)
        .fetch_optional(&st.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Item not found".to_string()))?;
    Ok(Json(row_to_item(&row)?))
}

pub async fn create_item(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<StudioItem>), AppError> {
    let title = body
        .get("title")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Title is required".to_string()))?
        .to_string();
    let kind = str_or(&body, "kind", "idea");
    let summary = truthy_str(&body, "summary");
    let content = str_or(&body, "content", "");

    let id = gen_id();
    let now = now_ms();

    sqlx::query(
        "INSERT INTO StudioItem (id, title, kind, summary, content, archived, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
    )
    .bind(&id)
    .bind(&title)
    .bind(&kind)
    .bind(&summary)
    .bind(&content)
    .bind(now)
    .bind(now)
    .execute(&st.db)
    .await?;

    let row = sqlx::query("SELECT * FROM StudioItem WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    Ok((StatusCode::CREATED, Json(row_to_item(&row)?)))
}

pub async fn update_item(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<StudioItem>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM StudioItem WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Item not found".to_string()));
    }

    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE StudioItem SET ");
    let mut first = true;

    if let Some(v) = body.get("title").and_then(|v| v.as_str()) {
        let trimmed = v.trim();
        if trimmed.is_empty() {
            return Err(AppError::BadRequest("Title cannot be empty".to_string()));
        }
        crate::push_set!(qb, first, "title = ", trimmed.to_string());
    }
    if let Some(v) = body.get("kind").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "kind = ", v.to_string());
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

    let row = sqlx::query("SELECT * FROM StudioItem WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    Ok(Json(row_to_item(&row)?))
}

pub async fn delete_item(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM StudioItem WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Item not found".to_string()));
    }
    sqlx::query("DELETE FROM StudioItem WHERE id = ?")
        .bind(&id)
        .execute(&st.db)
        .await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
