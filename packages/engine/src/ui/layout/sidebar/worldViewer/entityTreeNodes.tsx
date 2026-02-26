import type { EntityId } from "@/ecs/entity";
import type { UserWorld } from "@/ecs/world";
import { Parent } from "@/components";
import styles from "@ui/layout/sidebar/styles.module.css";
import { EntityIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { DebugHover } from "@ui/layout/sidebar/worldViewer/debugHover";
import { Dropdown } from "@ui/layout/sidebar/worldViewer/dropdown";
import type { ComponentTreeNode } from "@ui/layout/sidebar/worldViewer/entityItemList";
import { EditorDebugEntity } from "@ui/layout/sidebar/worldViewer/editorDebugEntity";
import { EntityRow } from "@ui/layout/sidebar/worldViewer/entityRow";
import { useEntitySelector } from "@ui/utilities/hooks/use-entity-selector";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type EntityTreeNodesProps = {
  entityIds: EntityId[];
  world: UserWorld;
  depth?: number;
  expandedEntityIds?: ReadonlyArray<EntityId>;
};

type NodeComponentsProps = {
  components: ComponentTreeNode[];
  depth: number;
};

type EntityTreeNodeProps = {
  entityId: EntityId;
  world: UserWorld;
  depth: number;
  expandedEntityIds?: ReadonlyArray<EntityId>;
};

type EntityNodeData = {
  childEntityIds: EntityId[];
  components: ComponentTreeNode[];
};

const areNodeDataEqual = (left: EntityNodeData, right: EntityNodeData) => {
  if (left.childEntityIds.length !== right.childEntityIds.length) {
    return false;
  }

  for (let index = 0; index < left.childEntityIds.length; index += 1) {
    if (left.childEntityIds[index] !== right.childEntityIds[index]) {
      return false;
    }
  }

  if (left.components.length !== right.components.length) {
    return false;
  }

  for (let index = 0; index < left.components.length; index += 1) {
    const leftComponent = left.components[index];
    const rightComponent = right.components[index];
    if (leftComponent.key !== rightComponent.key || leftComponent.name !== rightComponent.name) {
      return false;
    }
  }

  return true;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
const NodeComponents: React.FC<NodeComponentsProps> = ({ components, depth }) => {
  /***** RENDER *****/
  if (!components.length) {
    return null;
  }

  return (
    <ul className={styles.worldsEntitiesNestedEntityList}>
      {components.map((component) => (
        <li className={styles.worldsEntitiesEntityItem} key={component.key}>
          <Dropdown.Manager>
            <EntityRow.DropdownButton depth={depth + 1} hasContent={false}>
              <EntityRow.Root>
                <EntityRow.Icon.Component />
                <span className={styles.worldsEntitiesEntityName}>{component.name}</span>
              </EntityRow.Root>
            </EntityRow.DropdownButton>
          </Dropdown.Manager>
        </li>
      ))}
    </ul>
  );
};

export const EntityTreeNodes: React.FC<EntityTreeNodesProps> = ({
  entityIds,
  world,
  depth = 0,
  expandedEntityIds,
}) => {
  /***** RENDER *****/
  if (!entityIds.length) {
    return null;
  }

  return (
    <ul className={styles.worldsEntitiesNestedEntityList}>
      {entityIds.map((entityId) => (
        <EntityTreeNode
          depth={depth}
          entityId={entityId}
          expandedEntityIds={expandedEntityIds}
          key={entityId.toString()}
          world={world}
        />
      ))}
    </ul>
  );
};

const EntityTreeNode: React.FC<EntityTreeNodeProps> = ({
  entityId,
  world,
  depth,
  expandedEntityIds,
}) => {
  const nodeData = useEntitySelector(
    world,
    entityId,
    (currentWorld): EntityNodeData => {
      const allEntityIds = currentWorld.all();
      if (!allEntityIds.includes(entityId)) {
        return {
          childEntityIds: [],
          components: [],
        };
      }

      const childEntityIds: EntityId[] = [];
      const components = currentWorld
        .getComponentTypes(entityId)
        .map((componentType) => ({
          key: `${entityId}:${componentType.name}`,
          name: componentType.name,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));

      const entityIds = allEntityIds.slice().sort((left, right) => left - right);
      for (const currentEntityId of entityIds) {
        if (currentEntityId === entityId || currentWorld.has(currentEntityId, EditorDebugEntity)) {
          continue;
        }

        if (currentWorld.get(currentEntityId, Parent)?.entityId !== entityId) {
          continue;
        }

        childEntityIds.push(currentEntityId);
      }

      return {
        childEntityIds,
        components,
      };
    },
    areNodeDataEqual,
  );

  if (nodeData.childEntityIds.length === 0 && nodeData.components.length === 0) {
    return (
      <EntityIdContext value={entityId}>
        <li className={styles.worldsEntitiesEntityItem}>
          <DebugHover>
            <Dropdown.Manager forceExpanded={expandedEntityIds?.includes(entityId)}>
              <EntityRow.DropdownButton depth={depth} hasContent={false}>
                <EntityRow.Root>
                  <EntityRow.Icon.Entity />
                  <EntityRow.DebugName />
                  <EntityRow.Actions>
                    <EntityRow.Delete />
                  </EntityRow.Actions>
                </EntityRow.Root>
              </EntityRow.DropdownButton>
            </Dropdown.Manager>
          </DebugHover>
        </li>
      </EntityIdContext>
    );
  }

  return (
    <EntityIdContext value={entityId}>
      <li className={styles.worldsEntitiesEntityItem}>
        <DebugHover>
          <Dropdown.Manager forceExpanded={expandedEntityIds?.includes(entityId)}>
            <EntityRow.DropdownButton depth={depth} hasContent>
              <EntityRow.Root>
                <EntityRow.Icon.Entity />
                <EntityRow.DebugName />
                <EntityRow.Actions>
                  <EntityRow.Delete />
                </EntityRow.Actions>
              </EntityRow.Root>
            </EntityRow.DropdownButton>
            <Dropdown.Content>
              <EntityTreeNodes
                depth={depth + 1}
                entityIds={nodeData.childEntityIds}
                expandedEntityIds={expandedEntityIds}
                world={world}
              />
              <NodeComponents components={nodeData.components} depth={depth} />
            </Dropdown.Content>
          </Dropdown.Manager>
        </DebugHover>
      </li>
    </EntityIdContext>
  );
};
