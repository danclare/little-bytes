"use client";

import { useState } from "react";
import {
  EmptyState,
  Field,
  Modal,
  SectionTitle,
  capitalise,
  foodEmoji,
  statusLabel,
  type Child,
  type Food,
} from "./shared";

const PREPARATION_MODES = [
  { id: "fingerFood", label: "Finger food" },
  { id: "mashed", label: "Mashed" },
  { id: "puree", label: "Purée" },
] as const;

export function FoodCard({
  food,
  status,
  onSelect,
}: {
  food: Food;
  status?: string;
  onSelect: (food: Food) => void;
}) {
  return (
    <button
      type="button"
      className="food-card"
      onClick={() => onSelect(food)}
      aria-haspopup="dialog"
    >
      <span className="food-icon" aria-hidden="true">
        {foodEmoji(food.category)}
      </span>
      <strong>{food.name}</strong>
      <small>{food.description}</small>
      {status !== undefined && (
        <span className={`tag status-${status || "not_tried"}`}>{statusLabel(status)}</span>
      )}
      <span className="card-link" aria-hidden="true">
        View guide →
      </span>
    </button>
  );
}

export function FoodsPage({
  foods,
  search,
  setSearch,
  statuses,
  onSelect,
}: {
  foods: Food[];
  search: string;
  setSearch: (value: string) => void;
  statuses: Record<string, string>;
  onSelect: (food: Food) => void;
}) {
  const categories = [...new Set(foods.map((food) => food.category))].sort();
  const [category, setCategory] = useState("");
  const shown = category ? foods.filter((food) => food.category === category) : foods;
  return (
    <>
      <SectionTitle
        eyebrow="Explore gently"
        title="Food catalogue"
        subtitle="Tap a food to read age guidance, allergens and how to prepare it safely."
      />
      <section className="card card-soft toolbar">
        <Field
          label="Search foods"
          name="food-search"
          placeholder="Try banana or broccoli"
          defaultValue={search}
          onChange={setSearch}
        />
        <div className="field">
          <label htmlFor="food-category">Category</label>
          <select
            id="food-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {capitalise(item)}
              </option>
            ))}
          </select>
        </div>
      </section>
      <p className="result-count muted" aria-live="polite">
        {shown.length} food{shown.length === 1 ? "" : "s"}
      </p>
      {shown.length ? (
        <div className="grid grid-4">
          {shown.map((food) => (
            <FoodCard
              key={food.id}
              food={food}
              status={statuses[food.id] ?? ""}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No foods found"
          text="Try another search or clear the category filter."
        />
      )}
    </>
  );
}

export function FoodDetailModal({
  food,
  child,
  status,
  canEdit,
  onClose,
  onStatus,
  onLog,
}: {
  food: Food;
  child: Child | null;
  status?: string;
  canEdit: boolean;
  onClose: () => void;
  onStatus: (foodId: string, status: string) => void;
  onLog: () => void;
}) {
  const available = PREPARATION_MODES.filter((mode) => food.preparationGuides?.[mode.id]);
  const [mode, setMode] = useState<string>(available[0]?.id ?? "fingerFood");
  const guide = food.preparationGuides?.[mode];
  return (
    <Modal
      title={food.name}
      eyebrow={`${foodEmoji(food.category)} ${capitalise(food.category)} · food guide`}
      labelledBy="food-detail-title"
      onClose={onClose}
    >
      <p>{food.description}</p>
      <dl className="facts">
        <div className="facts-wide">
          <dt>Age guidance</dt>
          <dd>{food.ageGuidance}</dd>
        </div>
        {child && (
          <div>
            <dt>Status for {child.name}</dt>
            <dd>{statusLabel(status)}</dd>
          </div>
        )}
      </dl>
      {!!food.allergens.length && (
        <p className="notice notice-warning">
          <strong>Allergen information:</strong> {food.allergens.join(", ")}. This is general
          information and does not determine whether a food is safe for an individual child.
        </p>
      )}
      {!!food.hazards.length && (
        <>
          <h3>Watch out for</h3>
          <ul className="hazard-list">
            {food.hazards.map((hazard) => (
              <li key={hazard}>{hazard}</li>
            ))}
          </ul>
        </>
      )}
      <div className="field">
        <label htmlFor="prep-mode">Preparation style</label>
        <select id="prep-mode" value={mode} onChange={(event) => setMode(event.target.value)}>
          {(available.length ? available : PREPARATION_MODES).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="notice">
        <strong>{guide?.title ?? "Preparation guidance"}</strong>
        <p className="notice-text">{guide?.instructions ?? food.description}</p>
        {!!guide?.hazards?.length && (
          <ul className="hazard-list compact">
            {guide.hazards.map((hazard) => (
              <li key={hazard}>{hazard}</li>
            ))}
          </ul>
        )}
      </div>
      {child && canEdit && (
        <div className="modal-actions">
          <div className="field">
            <label htmlFor="food-status">Food status for {child.name}</label>
            <select
              id="food-status"
              value={status || "not_tried"}
              onChange={(event) => void onStatus(food.id, event.target.value)}
            >
              <option value="not_tried">Not tried</option>
              <option value="tried">Tried</option>
              <option value="liked">Liked</option>
              <option value="disliked">Disliked</option>
              <option value="temporarily_avoided">Temporarily avoided</option>
            </select>
          </div>
          <button type="button" className="button" onClick={onLog}>
            Add a diary entry
          </button>
        </div>
      )}
    </Modal>
  );
}
