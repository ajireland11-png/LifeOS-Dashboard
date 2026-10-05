use axum::{extract::{Path, State}, http::StatusCode, Json};
use serde::Serialize;
use serde_json::Value;
use sqlx::Row;
use crate::{error::AppError, prisma_dt::PrismaDateTime, utils::*, AppState};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ResearchPaper {
    id: String,
    title: String,
    authors: Option<String>,
    journal: Option<String>,
    year: Option<i64>,
    doi: Option<String>,
    source_url: Option<String>,
    abstract_text: Option<String>,
    scientific_question: Option<String>,
    background: Option<String>,
    mechanisms: Option<String>,
    interpretation: Option<String>,
    limitations: Option<String>,
    open_questions: Option<String>,
    notes: Option<String>,
    figures: Value,
    tables: Value,
    archived: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}

fn paper_from_row(r: &sqlx::sqlite::SqliteRow) -> Result<ResearchPaper, sqlx::Error> {
    let parse = |key: &str| -> Value {
        r.try_get::<String, _>(key).ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(Value::Array(vec![]))
    };
    Ok(ResearchPaper {
        id: r.try_get("id")?,
        title: r.try_get("title")?,
        authors: r.try_get("authors")?,
        journal: r.try_get("journal")?,
        year: r.try_get("year")?,
        doi: r.try_get("doi")?,
        source_url: r.try_get("sourceUrl")?,
        abstract_text: r.try_get("abstract")?,
        scientific_question: r.try_get("scientificQuestion")?,
        background: r.try_get("background")?,
        mechanisms: r.try_get("mechanisms")?,
        interpretation: r.try_get("interpretation")?,
        limitations: r.try_get("limitations")?,
        open_questions: r.try_get("openQuestions")?,
        notes: r.try_get("notes")?,
        figures: parse("figuresJson"),
        tables: parse("tablesJson"),
        archived: r.try_get("archived")?,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
    })
}

fn field(body: &Value, key: &str) -> Option<String> {
    body.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
}
fn json_field(body: &Value, key: &str) -> String {
    body.get(key).map(|v| v.to_string()).unwrap_or_else(|| "[]".into())
}

pub async fn list_papers(State(st): State<AppState>) -> Result<Json<Vec<ResearchPaper>>, AppError> {
    let rows = sqlx::query("SELECT * FROM ResearchPaper WHERE archived = 0 ORDER BY updatedAt DESC")
        .fetch_all(&st.db).await?;
    Ok(Json(rows.iter().map(paper_from_row).collect::<Result<Vec<_>,_>>()?))
}

pub async fn get_paper(State(st): State<AppState>, Path(id): Path<String>) -> Result<Json<ResearchPaper>, AppError> {
    let row = sqlx::query("SELECT * FROM ResearchPaper WHERE id = ?").bind(&id).fetch_optional(&st.db).await?
        .ok_or_else(|| AppError::NotFound("Paper not found".into()))?;
    Ok(Json(paper_from_row(&row)?))
}

pub async fn create_paper(State(st): State<AppState>, Json(body): Json<Value>) -> Result<(StatusCode, Json<ResearchPaper>), AppError> {
    let title = str_or(&body, "title", "").trim().to_string();
    if title.is_empty() { return Err(AppError::BadRequest("title is required".into())); }
    let id = gen_id(); let now = now_ms();
    sqlx::query("INSERT INTO ResearchPaper (id,title,authors,journal,year,doi,sourceUrl,abstract,scientificQuestion,background,mechanisms,interpretation,limitations,openQuestions,notes,figuresJson,tablesJson,archived,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)")
        .bind(&id).bind(&title).bind(field(&body,"authors")).bind(field(&body,"journal"))
        .bind(body.get("year").and_then(|v| v.as_i64())).bind(field(&body,"doi")).bind(field(&body,"sourceUrl"))
        .bind(field(&body,"abstract")).bind(field(&body,"scientificQuestion")).bind(field(&body,"background"))
        .bind(field(&body,"mechanisms")).bind(field(&body,"interpretation")).bind(field(&body,"limitations"))
        .bind(field(&body,"openQuestions")).bind(field(&body,"notes")).bind(json_field(&body,"figures"))
        .bind(json_field(&body,"tables")).bind(now).bind(now).execute(&st.db).await?;
    let row=sqlx::query("SELECT * FROM ResearchPaper WHERE id=?").bind(&id).fetch_one(&st.db).await?;
    Ok((StatusCode::CREATED,Json(paper_from_row(&row)?)))
}

pub async fn update_paper(State(st): State<AppState>, Path(id): Path<String>, Json(body): Json<Value>) -> Result<Json<ResearchPaper>, AppError> {
    let exists=sqlx::query("SELECT id FROM ResearchPaper WHERE id=?").bind(&id).fetch_optional(&st.db).await?;
    if exists.is_none(){return Err(AppError::NotFound("Paper not found".into()));}
    let now=now_ms();
    sqlx::query("UPDATE ResearchPaper SET title=COALESCE(?,title),authors=COALESCE(?,authors),journal=COALESCE(?,journal),year=COALESCE(?,year),doi=COALESCE(?,doi),sourceUrl=COALESCE(?,sourceUrl),abstract=COALESCE(?,abstract),scientificQuestion=COALESCE(?,scientificQuestion),background=COALESCE(?,background),mechanisms=COALESCE(?,mechanisms),interpretation=COALESCE(?,interpretation),limitations=COALESCE(?,limitations),openQuestions=COALESCE(?,openQuestions),notes=COALESCE(?,notes),figuresJson=COALESCE(?,figuresJson),tablesJson=COALESCE(?,tablesJson),archived=COALESCE(?,archived),updatedAt=? WHERE id=?")
        .bind(field(&body,"title")).bind(field(&body,"authors")).bind(field(&body,"journal")).bind(body.get("year").and_then(|v| v.as_i64()))
        .bind(field(&body,"doi")).bind(field(&body,"sourceUrl")).bind(field(&body,"abstract")).bind(field(&body,"scientificQuestion"))
        .bind(field(&body,"background")).bind(field(&body,"mechanisms")).bind(field(&body,"interpretation")).bind(field(&body,"limitations"))
        .bind(field(&body,"openQuestions")).bind(field(&body,"notes")).bind(body.get("figures").map(|v|v.to_string()))
        .bind(body.get("tables").map(|v|v.to_string())).bind(body.get("archived").and_then(|v|v.as_bool())).bind(now).bind(&id)
        .execute(&st.db).await?;
    let row=sqlx::query("SELECT * FROM ResearchPaper WHERE id=?").bind(&id).fetch_one(&st.db).await?;
    Ok(Json(paper_from_row(&row)?))
}

pub async fn delete_paper(State(st): State<AppState>, Path(id): Path<String>) -> Result<Json<Value>, AppError> {
    let res=sqlx::query("DELETE FROM ResearchPaper WHERE id=?").bind(&id).execute(&st.db).await?;
    if res.rows_affected()==0{return Err(AppError::NotFound("Paper not found".into()));}
    Ok(Json(serde_json::json!({"success":true})))
}
