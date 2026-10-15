mod common;

use axum::{body::Body, http::{Request, StatusCode}};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

async fn send(app: &axum::Router, method: &str, uri: &str, body: Value) -> (StatusCode, Value) {
    let response = app.clone().oneshot(
        Request::builder().method(method).uri(uri)
            .header("content-type", "application/json")
            .body(Body::from(body.to_string())).unwrap(),
    ).await.unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&bytes).unwrap_or(Value::Null))
}

#[tokio::test]
async fn studio_categories_and_collections_keep_one_canonical_item() {
    let (app, _temp_db) = common::setup_test_app().await;
    let (status, item) = send(&app, "POST", "/api/studio/items", json!({
        "title":"Blue glaze test","kind":"inspiration","category":"Ceramics","tags":["glaze","blue"],"sourceAccount":"@claymaker","techniques":["layered glaze","test tile"],"materials":["stoneware","cobalt oxide"],"skillLevel":"intermediate"
    })).await;
    assert_eq!(status, StatusCode::CREATED);
    let item_id = item["id"].as_str().unwrap().to_string();
    assert_eq!(item["sourceAccount"], "@claymaker");
    assert_eq!(item["techniques"][0], "layered glaze");
    assert_eq!(item["materials"][0], "stoneware");
    assert_eq!(item["skillLevel"], "intermediate");

    let (status, category) = send(&app, "POST", "/api/studio/categories", json!({"name":"Ceramics"})).await;
    assert_eq!(status, StatusCode::CREATED);
    let category_id = category["id"].as_str().unwrap().to_string();

    let (status, _) = send(&app, "PATCH", &format!("/api/studio/categories/{}", category_id), json!({"name":"Clay & glaze"})).await;
    assert_eq!(status, StatusCode::OK);
    let (status, updated_item) = send(&app, "GET", &format!("/api/studio/items/{}", item_id), Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated_item["category"], "Clay & glaze");

    let (_, first) = send(&app, "POST", "/api/studio/collections", json!({"name":"Glaze experiments"})).await;
    let (_, second) = send(&app, "POST", "/api/studio/collections", json!({"name":"Colour studies"})).await;
    let first_id = first["id"].as_str().unwrap().to_string();
    let second_id = second["id"].as_str().unwrap().to_string();
    for collection_id in [&first_id, &second_id] {
        let (status, _) = send(&app, "POST", &format!("/api/studio/collections/{}/items/{}", collection_id, item_id), json!({})).await;
        assert_eq!(status, StatusCode::CREATED);
    }

    let (status, collections) = send(&app, "GET", "/api/studio/collections", Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(collections.as_array().unwrap().len(), 2);
    assert!(collections.as_array().unwrap().iter().all(|c| c["items"].as_array().unwrap().iter().any(|id| id == &item_id)));

    let (status, _) = send(&app, "DELETE", &format!("/api/studio/categories/{}", category_id), Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    let (_, updated_item) = send(&app, "GET", &format!("/api/studio/items/{}", item_id), Value::Null).await;
    assert!(updated_item["category"].is_null());

    let (status, _) = send(&app, "DELETE", &format!("/api/studio/collections/{}/items/{}", first_id, item_id), Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    let (_, collections) = send(&app, "GET", "/api/studio/collections", Value::Null).await;
    assert_eq!(collections.as_array().unwrap().iter().find(|c| c["id"] == second_id).unwrap()["itemCount"], 1);
}

#[tokio::test]
async fn studio_favourites_persist_and_can_be_removed() {
    let (app, _temp_db) = common::setup_test_app().await;
    let (status, item) = send(&app, "POST", "/api/studio/items", json!({
        "title":"Woodworking joinery reel","kind":"inspiration"
    })).await;
    assert_eq!(status, StatusCode::CREATED);
    let id = item["id"].as_str().unwrap();

    let (status, updated) = send(&app, "PATCH", &format!("/api/studio/items/{id}"), json!({
        "isFavorite": true
    })).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["isFavorite"], true);

    let (status, loaded) = send(&app, "GET", &format!("/api/studio/items/{id}"), Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(loaded["isFavorite"], true);

    let (status, updated) = send(&app, "PATCH", &format!("/api/studio/items/{id}"), json!({
        "isFavorite": false
    })).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["isFavorite"], false);
}

