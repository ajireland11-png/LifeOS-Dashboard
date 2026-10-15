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
    source_url: Option<String>,
    image_url: Option<String>,
    category: Option<String>,
    tags: Value,
    source_account: Option<String>,
    techniques: Value,
    materials: Value,
    skill_level: Option<String>,
    is_favorite: bool,
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
        source_url: r.try_get("sourceUrl")?,
        image_url: r.try_get("imageUrl")?,
        category: r.try_get("category")?,
        tags: r.try_get::<String, _>("tagsJson").ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(Value::Array(vec![])),
        source_account: r.try_get("sourceAccount")?,
        techniques: r.try_get::<String, _>("techniquesJson").ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(Value::Array(vec![])),
        materials: r.try_get::<String, _>("materialsJson").ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(Value::Array(vec![])),
        skill_level: r.try_get("skillLevel")?,
        is_favorite: r.try_get::<i64, _>("isFavorite").unwrap_or(0) != 0,
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
    let source_url = truthy_str(&body, "sourceUrl");
    let image_url = truthy_str(&body, "imageUrl");
    let category = truthy_str(&body, "category");
    let tags_json = body.get("tags").map(|v| v.to_string()).unwrap_or_else(|| "[]".into());
    let source_account = truthy_str(&body, "sourceAccount");
    let techniques_json = body.get("techniques").map(|v| v.to_string()).unwrap_or_else(|| "[]".into());
    let materials_json = body.get("materials").map(|v| v.to_string()).unwrap_or_else(|| "[]".into());
    let skill_level = truthy_str(&body, "skillLevel");

    let id = gen_id();
    let now = now_ms();

    sqlx::query(
        "INSERT INTO StudioItem (id, title, kind, summary, content, sourceUrl, imageUrl, category, tagsJson, sourceAccount, techniquesJson, materialsJson, skillLevel, isFavorite, archived, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)",
    )
    .bind(&id)
    .bind(&title)
    .bind(&kind)
    .bind(&summary)
    .bind(&content)
    .bind(&source_url)
    .bind(&image_url)
    .bind(&category)
    .bind(&tags_json)
    .bind(&source_account)
    .bind(&techniques_json)
    .bind(&materials_json)
    .bind(&skill_level)
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
    if let Some(v) = patch_str(&body, "sourceUrl") {
        crate::push_set!(qb, first, "sourceUrl = ", v);
    }
    if let Some(v) = patch_str(&body, "imageUrl") {
        crate::push_set!(qb, first, "imageUrl = ", v);
    }
    if let Some(v) = patch_str(&body, "category") {
        crate::push_set!(qb, first, "category = ", v);
    }
    if let Some(v) = body.get("tags") {
        crate::push_set!(qb, first, "tagsJson = ", v.to_string());
    }
    if let Some(v) = patch_str(&body, "sourceAccount") {
        crate::push_set!(qb, first, "sourceAccount = ", v);
    }
    if let Some(v) = body.get("techniques") {
        crate::push_set!(qb, first, "techniquesJson = ", v.to_string());
    }
    if let Some(v) = body.get("materials") {
        crate::push_set!(qb, first, "materialsJson = ", v.to_string());
    }
    if let Some(v) = patch_str(&body, "skillLevel") {
        crate::push_set!(qb, first, "skillLevel = ", v);
    }
    if let Some(v) = patch_bool(&body, "isFavorite") {
        crate::push_set!(qb, first, "isFavorite = ", if v { 1_i64 } else { 0_i64 });
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


pub async fn list_categories(
    State(st): State<AppState>,
) -> Result<Json<Vec<Value>>, AppError> {
    let rows = sqlx::query("SELECT c.*, (SELECT COUNT(*) FROM StudioItem i WHERE i.category = c.name AND i.archived = 0) AS itemCount FROM StudioCategory c ORDER BY c.position ASC, c.name COLLATE NOCASE ASC")
        .fetch_all(&st.db).await?;
    let out = rows.iter().map(|r| -> Result<Value, sqlx::Error> { Ok(serde_json::json!({
        "id":r.try_get::<String,_>("id")?,"name":r.try_get::<String,_>("name")?,
        "description":r.try_get::<Option<String>,_>("description")?,"accent":r.try_get::<String,_>("accent")?,
        "position":r.try_get::<i64,_>("position")?,"itemCount":r.try_get::<i64,_>("itemCount")?
    })) }).collect::<Result<Vec<_>,_>>()?;
    Ok(Json(out))
}

pub async fn create_category(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    let name = body.get("name").and_then(Value::as_str).map(str::trim)
        .filter(|s| !s.is_empty()).ok_or_else(|| AppError::BadRequest("Category name is required".into()))?;
    let id = gen_id();
    let now = now_ms();
    sqlx::query("INSERT INTO StudioCategory (id,name,description,accent,position,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)")
        .bind(&id).bind(name).bind(truthy_str(&body,"description"))
        .bind(body.get("accent").and_then(Value::as_str).unwrap_or("sage"))
        .bind(body.get("position").and_then(Value::as_i64).unwrap_or(0))
        .bind(now).bind(now).execute(&st.db).await?;
    Ok((StatusCode::CREATED,Json(serde_json::json!({"id":id,"name":name,"description":body.get("description"),"accent":body.get("accent").and_then(Value::as_str).unwrap_or("sage"),"position":body.get("position").and_then(Value::as_i64).unwrap_or(0),"itemCount":0}))))
}

pub async fn update_category(
    State(st): State<AppState>, Path(id): Path<String>, Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let old = sqlx::query("SELECT name FROM StudioCategory WHERE id = ?").bind(&id).fetch_optional(&st.db).await?
        .ok_or_else(|| AppError::NotFound("Category not found".into()))?;
    let old_name: String = old.try_get("name")?;
    let new_name = body.get("name").and_then(Value::as_str).map(str::trim).filter(|s| !s.is_empty()).unwrap_or(&old_name).to_string();
    let mut tx = st.db.begin().await?;
    if new_name != old_name {
        sqlx::query("UPDATE StudioItem SET category = ?, updatedAt = ? WHERE category = ?")
            .bind(&new_name).bind(now_ms()).bind(&old_name).execute(&mut *tx).await?;
    }
    sqlx::query("UPDATE StudioCategory SET name = ?, description = COALESCE(?,description), accent = COALESCE(?,accent), position = COALESCE(?,position), updatedAt = ? WHERE id = ?")
        .bind(&new_name).bind(truthy_str(&body,"description"))
        .bind(body.get("accent").and_then(Value::as_str))
        .bind(body.get("position").and_then(Value::as_i64))
        .bind(now_ms()).bind(&id).execute(&mut *tx).await?;
    tx.commit().await?;
    let row = sqlx::query("SELECT c.*, (SELECT COUNT(*) FROM StudioItem i WHERE i.category=c.name AND i.archived=0) AS itemCount FROM StudioCategory c WHERE c.id=?")
        .bind(&id).fetch_one(&st.db).await?;
    Ok(Json(serde_json::json!({"id":id,"name":row.try_get::<String,_>("name")?,"description":row.try_get::<Option<String>,_>("description")?,"accent":row.try_get::<String,_>("accent")?,"position":row.try_get::<i64,_>("position")?,"itemCount":row.try_get::<i64,_>("itemCount")?})))
}

pub async fn delete_category(
    State(st): State<AppState>, Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let row = sqlx::query("SELECT name FROM StudioCategory WHERE id = ?").bind(&id).fetch_optional(&st.db).await?
        .ok_or_else(|| AppError::NotFound("Category not found".into()))?;
    let name: String = row.try_get("name")?;
    let mut tx = st.db.begin().await?;
    sqlx::query("UPDATE StudioItem SET category = NULL, updatedAt = ? WHERE category = ?")
        .bind(now_ms()).bind(&name).execute(&mut *tx).await?;
    sqlx::query("DELETE FROM StudioCategory WHERE id = ?").bind(&id).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(serde_json::json!({"success":true})))
}

pub async fn list_collections(
    State(st): State<AppState>,
) -> Result<Json<Vec<Value>>, AppError> {
    let rows = sqlx::query("SELECT * FROM StudioCollection ORDER BY updatedAt DESC, name COLLATE NOCASE ASC")
        .fetch_all(&st.db).await?;
    let mut out = Vec::new();
    for r in rows {
        let id: String = r.try_get("id")?;
        let item_rows = sqlx::query("SELECT itemId FROM StudioCollectionItem WHERE collectionId = ? ORDER BY createdAt DESC")
            .bind(&id).fetch_all(&st.db).await?;
        let items = item_rows.iter().map(|x| x.try_get::<String,_>("itemId")).collect::<Result<Vec<_>,_>>()?;
        out.push(serde_json::json!({
            "id":id,"name":r.try_get::<String,_>("name")?,"description":r.try_get::<Option<String>,_>("description")?,
            "coverUrl":r.try_get::<Option<String>,_>("coverUrl")?,"items":items,"itemCount":items.len()
        }));
    }
    Ok(Json(out))
}

pub async fn create_collection(
    State(st): State<AppState>, Json(body): Json<Value>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    let name = body.get("name").and_then(Value::as_str).map(str::trim)
        .filter(|s| !s.is_empty()).ok_or_else(|| AppError::BadRequest("Collection name is required".into()))?;
    let id=gen_id();let now=now_ms();
    sqlx::query("INSERT INTO StudioCollection (id,name,description,coverUrl,createdAt,updatedAt) VALUES (?,?,?,?,?,?)")
        .bind(&id).bind(name).bind(truthy_str(&body,"description")).bind(truthy_str(&body,"coverUrl")).bind(now).bind(now).execute(&st.db).await?;
    Ok((StatusCode::CREATED,Json(serde_json::json!({"id":id,"name":name,"description":body.get("description"),"coverUrl":body.get("coverUrl"),"items":[],"itemCount":0}))))
}

pub async fn update_collection(
    State(st): State<AppState>, Path(id): Path<String>, Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let exists:i64=sqlx::query_scalar("SELECT COUNT(*) FROM StudioCollection WHERE id=?").bind(&id).fetch_one(&st.db).await?;
    if exists==0{return Err(AppError::NotFound("Collection not found".into()))}
    sqlx::query("UPDATE StudioCollection SET name=COALESCE(?,name),description=COALESCE(?,description),coverUrl=COALESCE(?,coverUrl),updatedAt=? WHERE id=?")
        .bind(body.get("name").and_then(Value::as_str).map(str::trim).filter(|s|!s.is_empty()))
        .bind(body.get("description").and_then(Value::as_str))
        .bind(body.get("coverUrl").and_then(Value::as_str))
        .bind(now_ms()).bind(&id).execute(&st.db).await?;
    let row=sqlx::query("SELECT * FROM StudioCollection WHERE id=?").bind(&id).fetch_one(&st.db).await?;
    let ids=sqlx::query("SELECT itemId FROM StudioCollectionItem WHERE collectionId=?").bind(&id).fetch_all(&st.db).await?;
    let items=ids.iter().map(|r|r.try_get::<String,_>("itemId")).collect::<Result<Vec<_>,_>>()?;
    Ok(Json(serde_json::json!({"id":id,"name":row.try_get::<String,_>("name")?,"description":row.try_get::<Option<String>,_>("description")?,"coverUrl":row.try_get::<Option<String>,_>("coverUrl")?,"items":items,"itemCount":items.len()})))
}

pub async fn delete_collection(
    State(st): State<AppState>, Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let result=sqlx::query("DELETE FROM StudioCollection WHERE id=?").bind(&id).execute(&st.db).await?;
    if result.rows_affected()==0{return Err(AppError::NotFound("Collection not found".into()))}
    Ok(Json(serde_json::json!({"success":true})))
}

pub async fn link_collection_item(
    State(st): State<AppState>, Path((collection_id,item_id)): Path<(String,String)>,
) -> Result<(StatusCode,Json<Value>),AppError> {
    let collection:i64=sqlx::query_scalar("SELECT COUNT(*) FROM StudioCollection WHERE id=?").bind(&collection_id).fetch_one(&st.db).await?;
    if collection==0{return Err(AppError::NotFound("Collection not found".into()))}
    let item:i64=sqlx::query_scalar("SELECT COUNT(*) FROM StudioItem WHERE id=?").bind(&item_id).fetch_one(&st.db).await?;
    if item==0{return Err(AppError::NotFound("Studio item not found".into()))}
    sqlx::query("INSERT OR IGNORE INTO StudioCollectionItem (collectionId,itemId,createdAt) VALUES (?,?,?)")
        .bind(&collection_id).bind(&item_id).bind(now_ms()).execute(&st.db).await?;
    Ok((StatusCode::CREATED,Json(serde_json::json!({"success":true,"collectionId":collection_id,"itemId":item_id}))))
}

pub async fn unlink_collection_item(
    State(st): State<AppState>, Path((collection_id,item_id)): Path<(String,String)>,
) -> Result<Json<Value>,AppError> {
    sqlx::query("DELETE FROM StudioCollectionItem WHERE collectionId=? AND itemId=?").bind(&collection_id).bind(&item_id).execute(&st.db).await?;
    Ok(Json(serde_json::json!({"success":true})))
}

