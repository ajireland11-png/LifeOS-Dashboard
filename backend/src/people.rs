use axum::{extract::{Path, Query, State}, http::StatusCode, Json};
use serde_json::{json, Value};
use sqlx::{QueryBuilder, Row, Sqlite};
use std::collections::HashMap;

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::utils::{gen_id, now_ms, truthy_str};
use crate::AppState;

fn person_json(r: &sqlx::sqlite::SqliteRow) -> Result<Value, sqlx::Error> {
    Ok(json!({
        "id": r.try_get::<String, _>("id")?,
        "name": r.try_get::<String, _>("name")?,
        "relationship": r.try_get::<String, _>("relationship")?,
        "photoUrl": r.try_get::<Option<String>, _>("photoUrl")?,
        "birthday": r.try_get::<Option<String>, _>("birthday")?,
        "email": r.try_get::<Option<String>, _>("email")?,
        "phone": r.try_get::<Option<String>, _>("phone")?,
        "interests": r.try_get::<String, _>("interestsJson").ok().and_then(|s| serde_json::from_str::<Value>(&s).ok()).unwrap_or(json!([])),
        "giftIdeas": r.try_get::<String, _>("giftIdeasJson").ok().and_then(|s| serde_json::from_str::<Value>(&s).ok()).unwrap_or(json!([])),
        "notes": r.try_get::<Option<String>, _>("notes")?,
        "archived": r.try_get::<i64, _>("archived")? != 0,
        "createdAt": PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        "updatedAt": PrismaDateTime(r.try_get::<i64, _>("updatedAt")?)
    }))
}

fn date_json(r: &sqlx::sqlite::SqliteRow) -> Result<Value, sqlx::Error> {
    Ok(json!({
        "id": r.try_get::<String, _>("id")?,
        "personId": r.try_get::<String, _>("personId")?,
        "title": r.try_get::<String, _>("title")?,
        "date": r.try_get::<String, _>("date")?,
        "kind": r.try_get::<String, _>("kind")?,
        "recurrence": r.try_get::<String, _>("recurrence")?,
        "reminderDays": r.try_get::<i64, _>("reminderDays")?,
        "notes": r.try_get::<Option<String>, _>("notes")?,
        "createdAt": PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        "updatedAt": PrismaDateTime(r.try_get::<i64, _>("updatedAt")?)
    }))
}

async fn person_exists(db: &sqlx::SqlitePool, id: &str) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Person WHERE id = ?")
        .bind(id).fetch_one(db).await?;
    Ok(count > 0)
}

pub async fn list_people(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<Value>>, AppError> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM Person WHERE 1 = 1");
    if params.get("archived").map(String::as_str) != Some("true") {
        qb.push(" AND archived = 0");
    }
    if let Some(q) = params.get("q").filter(|q| !q.trim().is_empty()) {
        let pattern = format!("%{}%", q.trim());
        qb.push(" AND (name LIKE ").push_bind(pattern.clone())
            .push(" OR relationship LIKE ").push_bind(pattern.clone())
            .push(" OR notes LIKE ").push_bind(pattern).push(")");
    }
    qb.push(" ORDER BY name COLLATE NOCASE ASC");
    let rows = qb.build().fetch_all(&st.db).await?;
    let people = rows.iter().map(person_json).collect::<Result<Vec<_>, _>>()?;
    Ok(Json(people))
}

pub async fn create_person(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    let name = body.get("name").and_then(Value::as_str).map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Name is required".to_string()))?.to_string();
    let id = gen_id();
    let now = now_ms();
    let interests = body.get("interests").map(Value::to_string).unwrap_or_else(|| "[]".into());
    let gifts = body.get("giftIdeas").map(Value::to_string).unwrap_or_else(|| "[]".into());
    sqlx::query("INSERT INTO Person (id,name,relationship,photoUrl,birthday,email,phone,interestsJson,giftIdeasJson,notes,archived,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?)")
        .bind(&id).bind(name)
        .bind(body.get("relationship").and_then(Value::as_str).unwrap_or("Friend"))
        .bind(truthy_str(&body,"photoUrl")).bind(truthy_str(&body,"birthday"))
        .bind(truthy_str(&body,"email")).bind(truthy_str(&body,"phone"))
        .bind(interests).bind(gifts).bind(truthy_str(&body,"notes"))
        .bind(now).bind(now).execute(&st.db).await?;
    let row = sqlx::query("SELECT * FROM Person WHERE id = ?").bind(&id).fetch_one(&st.db).await?;
    Ok((StatusCode::CREATED, Json(person_json(&row)?)))
}

pub async fn get_person(
    State(st): State<AppState>, Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let row = sqlx::query("SELECT * FROM Person WHERE id = ?").bind(&id).fetch_optional(&st.db).await?
        .ok_or_else(|| AppError::NotFound("Person not found".to_string()))?;
    Ok(Json(person_json(&row)?))
}

pub async fn update_person(
    State(st): State<AppState>, Path(id): Path<String>, Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    if !person_exists(&st.db, &id).await? {
        return Err(AppError::NotFound("Person not found".to_string()));
    }
    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE Person SET ");
    let mut first = true;
    macro_rules! set { ($column:expr, $value:expr) => {{ if !first { qb.push(", "); } first = false; qb.push($column).push(" = ").push_bind($value); }}; }
    if let Some(v) = body.get("name").and_then(Value::as_str) { let v = v.trim(); if v.is_empty() { return Err(AppError::BadRequest("Name cannot be empty".into())); } set!("name", v.to_string()); }
    if let Some(v) = body.get("relationship").and_then(Value::as_str) { set!("relationship", v.to_string()); }
    for (key, column) in [("photoUrl","photoUrl"),("birthday","birthday"),("email","email"),("phone","phone"),("notes","notes")] {
        if let Some(v) = body.get(key) { set!(column, v.as_str().filter(|s| !s.is_empty()).map(str::to_string)); }
    }
    if let Some(v) = body.get("interests") { set!("interestsJson", v.to_string()); }
    if let Some(v) = body.get("giftIdeas") { set!("giftIdeasJson", v.to_string()); }
    if let Some(v) = body.get("archived").and_then(Value::as_bool) { set!("archived", if v {1_i64} else {0_i64}); }
    if first { return get_person(State(st), Path(id)).await; }
    set!("updatedAt", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;
    get_person(State(st), Path(id)).await
}

pub async fn delete_person(
    State(st): State<AppState>, Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    if !person_exists(&st.db, &id).await? {
        return Err(AppError::NotFound("Person not found".to_string()));
    }
    let mut tx = st.db.begin().await?;
    sqlx::query("DELETE FROM PersonTaskLink WHERE personId = ?").bind(&id).execute(&mut *tx).await?;
    sqlx::query("DELETE FROM PersonDate WHERE personId = ?").bind(&id).execute(&mut *tx).await?;
    sqlx::query("DELETE FROM Person WHERE id = ?").bind(&id).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(json!({"success":true})))
}


pub async fn list_all_dates(
    State(st): State<AppState>,
) -> Result<Json<Vec<Value>>, AppError> {
    let rows = sqlx::query("SELECT d.*, p.name AS personName FROM PersonDate d JOIN Person p ON p.id = d.personId WHERE p.archived = 0 ORDER BY d.date ASC")
        .fetch_all(&st.db).await?;
    let dates = rows.iter().map(|r| -> Result<Value, sqlx::Error> {
        let mut item = date_json(r)?;
        item["personName"] = json!(r.try_get::<String, _>("personName")?);
        Ok(item)
    }).collect::<Result<Vec<_>, _>>()?;
    Ok(Json(dates))
}

pub async fn list_dates(
    State(st): State<AppState>, Path(id): Path<String>,
) -> Result<Json<Vec<Value>>, AppError> {
    if !person_exists(&st.db, &id).await? { return Err(AppError::NotFound("Person not found".into())); }
    let rows = sqlx::query("SELECT * FROM PersonDate WHERE personId = ? ORDER BY date ASC")
        .bind(&id).fetch_all(&st.db).await?;
    Ok(Json(rows.iter().map(date_json).collect::<Result<Vec<_>, _>>()?))
}

pub async fn create_date(
    State(st): State<AppState>, Path(id): Path<String>, Json(body): Json<Value>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    if !person_exists(&st.db, &id).await? { return Err(AppError::NotFound("Person not found".into())); }
    let title = body.get("title").and_then(Value::as_str).map(str::trim).filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Date title is required".into()))?;
    let date = body.get("date").and_then(Value::as_str).filter(|s| s.len() >= 10)
        .ok_or_else(|| AppError::BadRequest("A date is required (YYYY-MM-DD)".into()))?;
    let id_date = gen_id();
    let now = now_ms();
    sqlx::query("INSERT INTO PersonDate (id,personId,title,date,kind,recurrence,reminderDays,notes,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(&id_date).bind(&id).bind(title).bind(date)
        .bind(body.get("kind").and_then(Value::as_str).unwrap_or("important"))
        .bind(body.get("recurrence").and_then(Value::as_str).unwrap_or("yearly"))
        .bind(body.get("reminderDays").and_then(Value::as_i64).unwrap_or(7).clamp(0,365))
        .bind(truthy_str(&body,"notes")).bind(now).bind(now).execute(&st.db).await?;
    let row = sqlx::query("SELECT * FROM PersonDate WHERE id = ?").bind(&id_date).fetch_one(&st.db).await?;
    Ok((StatusCode::CREATED, Json(date_json(&row)?)))
}

pub async fn update_date(
    State(st): State<AppState>, Path((person_id,date_id)): Path<(String,String)>, Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    if !person_exists(&st.db, &person_id).await? { return Err(AppError::NotFound("Person not found".into())); }
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM PersonDate WHERE id = ? AND personId = ?").bind(&date_id).bind(&person_id).fetch_one(&st.db).await?;
    if exists == 0 { return Err(AppError::NotFound("Date not found".into())); }
    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE PersonDate SET ");
    let mut first = true;
    macro_rules! set { ($column:literal, $value:expr) => {{ if !first { qb.push(", "); } first = false; qb.push($column).push(" = ").push_bind($value); }}; }
    if let Some(v) = body.get("title").and_then(Value::as_str) { set!("title",v.to_string()); }
    if let Some(v) = body.get("date").and_then(Value::as_str) { set!("date",v.to_string()); }
    if let Some(v) = body.get("kind").and_then(Value::as_str) { set!("kind",v.to_string()); }
    if let Some(v) = body.get("recurrence").and_then(Value::as_str) { set!("recurrence",v.to_string()); }
    if let Some(v) = body.get("reminderDays").and_then(Value::as_i64) { set!("reminderDays",v.clamp(0,365)); }
    if let Some(v) = body.get("notes") { set!("notes",v.as_str().filter(|s| !s.is_empty()).map(str::to_string)); }
    if first { let row=sqlx::query("SELECT * FROM PersonDate WHERE id = ?").bind(&date_id).fetch_one(&st.db).await?; return Ok(Json(date_json(&row)?)); }
    set!("updatedAt",now);
    qb.push(" WHERE id = ").push_bind(&date_id).push(" AND personId = ").push_bind(&person_id);
    qb.build().execute(&st.db).await?;
    let row=sqlx::query("SELECT * FROM PersonDate WHERE id = ?").bind(&date_id).fetch_one(&st.db).await?;
    Ok(Json(date_json(&row)?))
}

pub async fn delete_date(
    State(st): State<AppState>, Path((person_id,date_id)): Path<(String,String)>,
) -> Result<Json<Value>, AppError> {
    let result=sqlx::query("DELETE FROM PersonDate WHERE id = ? AND personId = ?").bind(&date_id).bind(&person_id).execute(&st.db).await?;
    if result.rows_affected()==0 { return Err(AppError::NotFound("Date not found".into())); }
    Ok(Json(json!({"success":true})))
}

pub async fn list_person_tasks(
    State(st): State<AppState>, Path(id): Path<String>,
) -> Result<Json<Vec<Value>>, AppError> {
    if !person_exists(&st.db, &id).await? { return Err(AppError::NotFound("Person not found".into())); }
    let rows=sqlx::query("SELECT t.id,t.title,t.description,t.status,t.priority,t.dueDate,t.updatedAt FROM Task t JOIN PersonTaskLink l ON l.taskId=t.id WHERE l.personId=? AND t.archived=0 ORDER BY t.dueDate IS NULL, t.dueDate ASC, t.createdAt DESC")
        .bind(&id).fetch_all(&st.db).await?;
    let tasks=rows.iter().map(|r| -> Result<Value,sqlx::Error> { Ok(json!({
        "id":r.try_get::<String,_>("id")?,"title":r.try_get::<String,_>("title")?,
        "description":r.try_get::<Option<String>,_>("description")?,
        "status":r.try_get::<String,_>("status")?,"priority":r.try_get::<String,_>("priority")?,
        "dueDate":r.try_get::<Option<i64>,_>("dueDate")?.map(PrismaDateTime),
        "updatedAt":PrismaDateTime(r.try_get::<i64,_>("updatedAt")?)
    })) }).collect::<Result<Vec<_>,_>>()?;
    Ok(Json(tasks))
}

pub async fn link_task(
    State(st): State<AppState>, Path((person_id,task_id)): Path<(String,String)>,
) -> Result<(StatusCode,Json<Value>),AppError> {
    if !person_exists(&st.db,&person_id).await? { return Err(AppError::NotFound("Person not found".into())); }
    let exists:i64=sqlx::query_scalar("SELECT COUNT(*) FROM Task WHERE id = ?").bind(&task_id).fetch_one(&st.db).await?;
    if exists==0 { return Err(AppError::NotFound("Task not found".into())); }
    sqlx::query("INSERT OR IGNORE INTO PersonTaskLink (personId,taskId,createdAt) VALUES (?,?,?)")
        .bind(&person_id).bind(&task_id).bind(now_ms()).execute(&st.db).await?;
    Ok((StatusCode::CREATED,Json(json!({"success":true,"personId":person_id,"taskId":task_id}))))
}

pub async fn unlink_task(
    State(st): State<AppState>, Path((person_id,task_id)): Path<(String,String)>,
) -> Result<Json<Value>,AppError> {
    sqlx::query("DELETE FROM PersonTaskLink WHERE personId = ? AND taskId = ?").bind(&person_id).bind(&task_id).execute(&st.db).await?;
    Ok(Json(json!({"success":true})))
}

/// List the people connected to a profile. Each relationship is stored in both
/// directions so it can be navigated from either person's profile.
pub async fn list_relationships(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Vec<Value>>, AppError> {
    if !person_exists(&st.db, &id).await? {
        return Err(AppError::NotFound("Person not found".into()));
    }
    let rows = sqlx::query(
        "SELECT p.id, p.name, p.relationship, p.photoUrl, r.label, r.createdAt
         FROM PersonRelationship r
         JOIN Person p ON p.id = r.relatedPersonId
         WHERE r.personId = ? AND p.archived = 0
         ORDER BY p.name COLLATE NOCASE ASC"
    ).bind(&id).fetch_all(&st.db).await?;
    let items = rows.iter().map(|r| Ok(json!({
        "id": r.try_get::<String, _>("id")?,
        "name": r.try_get::<String, _>("name")?,
        "relationship": r.try_get::<String, _>("relationship")?,
        "photoUrl": r.try_get::<Option<String>, _>("photoUrl")?,
        "label": r.try_get::<String, _>("label")?,
        "createdAt": PrismaDateTime(r.try_get::<i64, _>("createdAt")?)
    }))).collect::<Result<Vec<Value>, sqlx::Error>>()?;
    Ok(Json(items))
}

pub async fn link_people(
    State(st): State<AppState>,
    Path(person_id): Path<String>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    let related_id = body.get("relatedPersonId").and_then(Value::as_str)
        .map(str::trim).filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("A related person is required".into()))?;
    if person_id == related_id {
        return Err(AppError::BadRequest("A person cannot be related to themselves".into()));
    }
    if !person_exists(&st.db, &person_id).await? {
        return Err(AppError::NotFound("Person not found".into()));
    }
    if !person_exists(&st.db, related_id).await? {
        return Err(AppError::NotFound("Related person not found".into()));
    }
    let label = body.get("label").and_then(Value::as_str)
        .map(str::trim).filter(|s| !s.is_empty()).unwrap_or("Related");
    let now = now_ms();
    let mut tx = st.db.begin().await?;
    sqlx::query("INSERT OR IGNORE INTO PersonRelationship (personId, relatedPersonId, label, createdAt) VALUES (?,?,?,?)")
        .bind(&person_id).bind(related_id).bind(label).bind(now).execute(&mut *tx).await?;
    sqlx::query("INSERT OR IGNORE INTO PersonRelationship (personId, relatedPersonId, label, createdAt) VALUES (?,?,?,?)")
        .bind(related_id).bind(&person_id).bind(label).bind(now).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(json!({
        "success": true,
        "personId": person_id,
        "relatedPersonId": related_id,
        "label": label
    }))))
}

pub async fn unlink_people(
    State(st): State<AppState>,
    Path((person_id, related_id)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    sqlx::query(
        "DELETE FROM PersonRelationship
         WHERE (personId = ? AND relatedPersonId = ?)
            OR (personId = ? AND relatedPersonId = ?)"
    ).bind(&person_id).bind(&related_id).bind(&related_id).bind(&person_id)
     .execute(&st.db).await?;
    Ok(Json(json!({"success": true})))
}

