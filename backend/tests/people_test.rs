mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

async fn send(app: &axum::Router, method: &str, uri: &str, body: Value) -> (StatusCode, Value) {
    let response = app.clone().oneshot(
        Request::builder()
            .method(method)
            .uri(uri)
            .header("content-type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap(),
    ).await.unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, value)
}

#[tokio::test]
async fn people_dates_and_shared_tasks_persist_without_duplicating_tasks() {
    let (app, _temp_db) = common::setup_test_app().await;

    let (status, person) = send(&app, "POST", "/api/people", json!({
        "name":"Alex Example",
        "relationship":"Friend",
        "birthday":"1994-04-12",
        "interests":["hiking","ceramics"],
        "giftIdeas":["field guide"]
    })).await;
    assert_eq!(status, StatusCode::CREATED);
    let person_id = person["id"].as_str().unwrap().to_string();
    assert_eq!(person["name"], "Alex Example");
    assert_eq!(person["interests"][0], "hiking");

    let (status, date) = send(&app, "POST", &format!("/api/people/{}/dates", person_id), json!({
        "title":"Annual catch-up",
        "date":"2026-11-20",
        "kind":"visit",
        "recurrence":"yearly",
        "reminderDays":14
    })).await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(date["title"], "Annual catch-up");

    let (status, task) = send(&app, "POST", "/api/tasks", json!({
        "title":"Book dinner",
        "status":"todo",
        "priority":"medium"
    })).await;
    assert_eq!(status, StatusCode::CREATED);
    let task_id = task["id"].as_str().unwrap().to_string();

    let (status, _) = send(&app, "POST", &format!("/api/people/{}/tasks/{}", person_id, task_id), json!({})).await;
    assert_eq!(status, StatusCode::CREATED);

    let (status, linked) = send(&app, "GET", &format!("/api/people/{}/tasks", person_id), Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(linked.as_array().unwrap().len(), 1);
    assert_eq!(linked[0]["id"], task_id);

    let (status, dates) = send(&app, "GET", "/api/people/dates", Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(dates[0]["personName"], "Alex Example");

    let (status, _) = send(&app, "DELETE", &format!("/api/people/{}", person_id), Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    let (status, preserved_task) = send(&app, "GET", &format!("/api/tasks/{}", task_id), Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(preserved_task["id"], task_id);
}

#[tokio::test]
async fn people_relationships_are_bidirectional_and_removable_without_deleting_profiles() {
    let (app, _temp_db) = common::setup_test_app().await;
    let (status, alex) = send(&app, "POST", "/api/people", json!({"name":"Alex"})).await;
    assert_eq!(status, StatusCode::CREATED);
    let (status, sam) = send(&app, "POST", "/api/people", json!({"name":"Sam"})).await;
    assert_eq!(status, StatusCode::CREATED);
    let alex_id = alex["id"].as_str().unwrap();
    let sam_id = sam["id"].as_str().unwrap();

    let (status, _) = send(&app, "POST", &format!("/api/people/{alex_id}/relationships"), json!({
        "relatedPersonId": sam_id,
        "label": "Sibling"
    })).await;
    assert_eq!(status, StatusCode::CREATED);

    let (status, alex_links) = send(&app, "GET", &format!("/api/people/{alex_id}/relationships"), Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(alex_links.as_array().unwrap().len(), 1);
    assert_eq!(alex_links[0]["name"], "Sam");
    assert_eq!(alex_links[0]["label"], "Sibling");

    let (status, sam_links) = send(&app, "GET", &format!("/api/people/{sam_id}/relationships"), Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(sam_links.as_array().unwrap().len(), 1);
    assert_eq!(sam_links[0]["name"], "Alex");

    let (status, graph) = send(&app, "GET", "/api/atlas/graph", Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    assert!(graph["edges"].as_array().unwrap().iter().any(|edge| {
        edge["sourceType"] == "person" && edge["targetType"] == "person"
            && edge["label"] == "Sibling"
    }));

    let (status, _) = send(&app, "DELETE", &format!("/api/people/{alex_id}/relationships/{sam_id}"), Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    let (_, remaining) = send(&app, "GET", &format!("/api/people/{alex_id}/relationships"), Value::Null).await;
    assert!(remaining.as_array().unwrap().is_empty());

    let (status, still_there) = send(&app, "GET", &format!("/api/people/{sam_id}"), Value::Null).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(still_there["name"], "Sam");
}

