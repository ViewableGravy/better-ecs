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

  const hasSameEntityIds = left.childEntityIds.every(
    (entityId, index) => entityId === right.childEntityIds[index],
  );
  if (!hasSameEntityIds) {
    return false;
  }

  if (left.components.length !== right.components.length) {
    return false;
  }

  const hasSameComponents = left.components.every((component, index) => {
    const rightComponent = right.components[index];
    return component.key === rightComponent.key && component.name === rightComponent.name;
  });
  if (!hasSameComponents) {
    return false;
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
      const allEntityIdSet = new Set(allEntityIds);

      if (!allEntityIdSet.has(entityId)) {
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

      for (const currentEntityId of allEntityIds) {
        if (currentEntityId === entityId || currentWorld.has(currentEntityId, EditorDebugEntity)) {
          continue;
        }

        if (currentWorld.get(currentEntityId, Parent)?.entityId !== entityId) {
          continue;
        }

        childEntityIds.push(currentEntityId);
      }

      childEntityIds.sort((left, right) => left - right);

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
